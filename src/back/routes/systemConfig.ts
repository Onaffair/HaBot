import { Express } from 'express'
import { configService } from '../../bot/services/db'
import App from '../../bot/core/app'
import { BeanFactory } from '../../bot/core/bean'
import { refreshOneBotHttpConfig } from '../../bot/api/common/oneBot'
import type { ResourceConfig } from '../../bot/beans/resource'
import { createLogger } from '../../bot/utils/logger'
import { resful, HttpError } from '../utils/resfulAPI'

// ============================================================================
// 系统配置路由
// ----------------------------------------------------------------------------
// 将原 .env 配置项开放到 Web 端管理：
// - GET /api/system-configs  按 category 分组返回全量配置（含元数据，供表单渲染）
// - PUT /api/system-configs  批量保存 { items: [{ key, value }] }
//   若变更项标记 requiresRestart 且 Bot 正在运行，保存后自动重启 Bot 使新参数生效；
//   Bot 未运行时仅热更新 HTTP 通道，下次启动自然读取新配置。
// ============================================================================

const logger = createLogger('SystemConfigRoute')

/** 分组展示元数据：中文名与分区顺序，未知分组按 50 兜底排在末尾 */
const CATEGORY_META: Record<string, { label: string; order: number }> = {
  websocket: { label: 'WebSocket 连接', order: 1 },
  http: { label: 'HTTP API', order: 2 },
  bot: { label: 'Bot 身份', order: 3 },
  resource: { label: '资源路径', order: 4 },
  ai: { label: 'AI 配置', order: 5 },
  backend: { label: '后端服务', order: 6 },
  custom: { label: '自定义', order: 90 },
}

/**
 * 配置 → 运行态同步：部分配置被缓存到 Bean 运行态中，DB 改完需回写一次才生效。
 * 未列出的 key 由消费方按需实时读取（或标记 requiresRestart 走重启流程）。
 */
const BEAN_SYNC: Record<string, () => void> = {
  ME: () => BeanFactory.getInstance().setBeanValue('me', configService.get('ME')),
  RESOURCE_PATH: () => {
    const fac = BeanFactory.getInstance()
    const current = fac.getBeanValue<ResourceConfig>('resource')
    if (current) {
      fac.setBeanValue('resource', { ...current, path: configService.get('RESOURCE_PATH', 'src/resources') })
    }
  },
}

export function createSystemConfigRoutes(app: Express) {
  const prefix = '/api/system-configs'

  // 全量配置（按分组聚合，组内按 sortOrder 升序）
  app.get(
    prefix,
    resful(async () => {
      const rows = await configService.getAll()
      const grouped = new Map<string, any[]>()
      for (const row of rows as any[]) {
        const list = grouped.get(row.category) ?? []
        list.push(row)
        grouped.set(row.category, list)
      }
      const groups = [...grouped.entries()]
        .map(([category, items]) => ({
          category,
          label: CATEGORY_META[category]?.label ?? category,
          order: CATEGORY_META[category]?.order ?? 50,
          items: items.sort((a, b) => a.sortOrder - b.sortOrder),
        }))
        .sort((a, b) => a.order - b.order)
      return { groups }
    }),
  )

  // 批量更新：只写实际变化的项，返回变化清单与 Bot 重启结果
  app.put(
    prefix,
    resful(async (req) => {
      const { items } = req.body ?? {}
      if (!Array.isArray(items)) throw new HttpError(400, 'items 必须是数组')

      const restartKeys = await configService.getRestartKeys()
      const currentRows = (await configService.getAll()) as any[]
      const currentMap = new Map(currentRows.map((row) => [row.key, row.value]))

      const updated: string[] = []
      for (const item of items) {
        if (!item || typeof item.key !== 'string' || !item.key) {
          throw new HttpError(400, '配置项缺少合法的 key')
        }
        const value = item.value === null || item.value === undefined ? '' : String(item.value)
        if (currentMap.get(item.key) === value) continue
        await configService.set(item.key, value)
        BEAN_SYNC[item.key]?.()
        updated.push(item.key)
      }

      let restarted = false
      let restartError: string | undefined
      if (updated.some((key) => restartKeys.has(key))) {
        const bot = App.getInstance()
        if (bot.isRunning) {
          try {
            bot.restart()
            restarted = true
            logger.info('Bot restarted after connection config updated')
          } catch (err: any) {
            restartError = err?.message || 'restart failed'
            logger.error(`Bot restart failed: ${restartError}`)
          }
        } else {
          // Bot 未在运行：无需重建 WS，仅让 HTTP 通道立即跟上
          refreshOneBotHttpConfig()
        }
      }

      return { updated, restarted, restartError }
    }),
  )
}
