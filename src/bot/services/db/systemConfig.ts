import { db } from '@utils/db'
import { createLogger } from '@utils/logger'

// ============================================================================
// 系统配置服务（单例）
// ----------------------------------------------------------------------------
// 将原 .env 中的可配置项统一管理到数据库（SystemConfig 表），启动时加载到内存
// 缓存，业务代码通过 configService.get('KEY') 读取；后端路由保存时同步更新
// 缓存与数据库。首次 init 时自动将 .env 中已有的值导入 DB（种子），后续以 DB 为准。
// 读取优先级：DB cache → process.env → 函数参数 fallback。
// ============================================================================

const logger = createLogger('ConfigService')

/**
 * 配置种子定义：首次启动时若 DB 无对应 key 则用 .env 值（或默认值）写入。
 * category/label/type/requiresRestart 决定前端如何渲染与是否触发重启。
 * fallbackEnvKeys 用于已废弃的旧键：种子导入时按顺序取第一个非空值，保证迁移不丢配置。
 */
const SEEDS: Array<{
  key: string
  envKey?: string
  fallbackEnvKeys?: string[]
  defaultValue?: string
  category: string
  label: string
  type?: string
  description?: string
  requiresRestart?: boolean
  sortOrder?: number
}> = [
  // --- WebSocket ---
  { key: 'WS_URL', envKey: 'WS_URL', category: 'websocket', label: 'WS 连接地址', description: 'OneBot 反向 WebSocket URL', requiresRestart: true, sortOrder: 1 },
  { key: 'WS_TOKEN', envKey: 'WS_TOKEN', category: 'websocket', label: 'WS Token', type: 'password', requiresRestart: true, sortOrder: 2 },
  // --- HTTP API ---
  { key: 'HTTP_BASE_URL', envKey: 'HTTP_BASE_URL', category: 'http', label: 'HTTP API 地址', description: 'OneBot HTTP 接口基地址', requiresRestart: true, sortOrder: 1 },
  { key: 'HTTP_TOKEN', envKey: 'HTTP_TOKEN', category: 'http', label: 'HTTP Token', type: 'password', requiresRestart: true, sortOrder: 2 },
  // --- Bot ---
  { key: 'ME', envKey: 'ME', category: 'bot', label: 'Bot QQ 号', description: '机器人自身 QQ 号（用于 @判断）', sortOrder: 1 },
  // --- 资源路径 ---
  { key: 'RESOURCE_PATH', envKey: 'RESOURCE_PATH', defaultValue: 'src/resources', category: 'resource', label: '资源根目录', sortOrder: 1 },
  { key: 'outputDir', envKey: 'outputDir', defaultValue: 'src/output', category: 'resource', label: '输出目录', sortOrder: 2 },
  // --- AI 平台 ---
  { key: 'OPENAI_API_KEY', envKey: 'OPENAI_API_KEY', category: 'ai', label: 'OpenAI API Key', type: 'password', sortOrder: 1 },
  { key: 'OPENAI_BASE_URL', envKey: 'OPENAI_BASE_URL', defaultValue: 'https://api.siliconflow.cn/v1/chat/completions', category: 'ai', label: 'OpenAI Base URL', sortOrder: 2 },
  { key: 'ZHIPUAI_API_KEY', envKey: 'ZHIPUAI_API_KEY', category: 'ai', label: '智谱 API Key', type: 'password', sortOrder: 3 },
  { key: 'ZHIPUAI_BASE_URL', envKey: 'ZHIPUAI_BASE_URL', defaultValue: 'https://open.bigmodel.cn/api/paas/v4/images/generations', category: 'ai', label: '智谱 Base URL', sortOrder: 4 },
  { key: 'FISHAUDIO_API_KEY', envKey: 'FISHAUDIO_API_KEY', category: 'ai', label: 'Fish Audio API Key', type: 'password', sortOrder: 5 },
  { key: 'FISHAUDIO_BASE_URL', envKey: 'FISHAUDIO_BASE_URL', defaultValue: 'https://api.fish.audio/v1/tts', category: 'ai', label: 'Fish Audio Base URL', sortOrder: 6 },
  // --- AI 全局代理（原 Fish Audio 专用代理升级为全局） ---
  { key: 'AI_PROXY_HOST', fallbackEnvKeys: ['FISHAUDIO_PROXY_HOST'], category: 'ai', label: 'AI 全局代理地址', description: '留空表示不使用代理', defaultValue: '', sortOrder: 10 },
  { key: 'AI_PROXY_PORT', fallbackEnvKeys: ['FISHAUDIO_PROXY_PORT'], category: 'ai', label: 'AI 全局代理端口', type: 'number', defaultValue: '7897', sortOrder: 11 },
]

/**
 * 解析种子值：按 envKey → fallbackEnvKeys 顺序取 .env 中第一个非空值，
 * 全部缺失时回落到 defaultValue。
 */
function resolveSeedValue(seed: (typeof SEEDS)[number]): string {
  const envKeys = [seed.envKey, ...(seed.fallbackEnvKeys ?? [])].filter(Boolean) as string[]
  for (const envKey of envKeys) {
    const val = process.env[envKey]
    if (val !== undefined && val !== '') return val
  }
  return seed.defaultValue ?? ''
}

export class ConfigService {
  private static instance: ConfigService
  private cache = new Map<string, string>()
  private initialized = false
  /**
   * 连接参数变更计数：仅在 requiresRestart=true 的配置被写入时递增。
   * App 记录建立连接时的值，两者不一致即表示"配置已更新，需重启 Bot 生效"。
   */
  private restartVersion = 0

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService()
    }
    return ConfigService.instance
  }

  /**
   * 初始化：从 DB 加载全量配置到缓存；
   * 首次启动时自动将 .env 中已有的值导入 DB（upsert 仅在 key 不存在时写入）。
   */
  async init(): Promise<void> {
    if (!db.systemConfig) {
      logger.warn('systemConfig table not available, skip init')
      return
    }
    // 导入种子（仅 key 不存在时写入，保留用户后续修改）
    for (const seed of SEEDS) {
      const existed = await db.systemConfig.findUnique({ where: { key: seed.key } })
      if (existed) continue
      await db.systemConfig.create({
        data: {
          key: seed.key,
          value: resolveSeedValue(seed),
          category: seed.category,
          label: seed.label,
          type: seed.type ?? 'string',
          description: seed.description ?? null,
          requiresRestart: seed.requiresRestart ?? false,
          sortOrder: seed.sortOrder ?? 0,
        },
      })
    }
    // 加载全量到内存缓存
    const rows = await db.systemConfig.findMany()
    this.cache.clear()
    for (const row of rows) {
      this.cache.set(row.key, row.value)
    }
    this.initialized = true
    logger.info(`ConfigService initialized: ${this.cache.size} key(s) loaded`)
  }

  /** 读取配置：cache → process.env → fallback 参数 */
  get(key: string, fallback?: string): string {
    const val = this.cache.get(key)
    if (val !== undefined && val !== '') return val
    const envVal = process.env[key]
    if (envVal) return envVal
    return fallback ?? ''
  }

  /** 读取数字型配置 */
  getNumber(key: string, defaultVal = 0): number {
    const raw = this.get(key)
    const n = Number(raw)
    return isNaN(n) ? defaultVal : n
  }

  /** 更新单条配置（写 DB + 刷新缓存）；连接类配置变更额外递增 restartVersion */
  async set(key: string, value: string): Promise<void> {
    if (!db.systemConfig) return
    const record = await db.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, category: 'custom', label: key },
    })
    this.cache.set(key, value)
    if (record?.requiresRestart) this.restartVersion += 1
    logger.info(`Config updated: ${key}`)
  }

  /** 批量更新 */
  async setMany(items: Array<{ key: string; value: string }>): Promise<void> {
    for (const item of items) {
      await this.set(item.key, item.value)
    }
  }

  /** 获取全部配置（前端展示用） */
  async getAll() {
    if (!db.systemConfig) return []
    return db.systemConfig.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] })
  }

  /** 获取 requiresRestart=true 的 key 列表（用于判断是否需要重启 bot） */
  async getRestartKeys(): Promise<Set<string>> {
    if (!db.systemConfig) return new Set()
    const rows = await db.systemConfig.findMany({ where: { requiresRestart: true } })
    return new Set(rows.map((r: any) => r.key))
  }

  /** 是否已完成初始化 */
  get isReady(): boolean {
    return this.initialized
  }

  /** 当前连接参数版本号：与 App 记录值不一致说明 Bot 需重启才生效 */
  get connectionVersion(): number {
    return this.restartVersion
  }
}

/** 全局配置服务实例 */
export const configService = ConfigService.getInstance()
export default ConfigService
