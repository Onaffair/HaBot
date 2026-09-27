import { CommandFactory } from './command'
import { Session } from './session'
import { OneBotMessageReceive } from '@/interface/onebot'
import { FilterFactory } from './filter'
import { OneBotClient, createOneBotClientFromEnv } from './oneBotClient'
import { refreshOneBotHttpConfig } from '@/api/common/oneBot'
import { configService } from '@/services/db/systemConfig'

import { createLogger } from '@utils/logger'

const logger = createLogger('App')

/**
 * 消息处理管道：过滤器 -> 命令匹配 -> 分发响应。
 * 传输层（OneBotClient）通过构造参数注入，默认从环境变量创建；
 * 测试或多实例场景可传入自定义 client。
 */
export interface AppOptions {
  client?: OneBotClient
}

class App {
  static instance: App
  private client: OneBotClient
  private commandFactory: CommandFactory
  private filterFactory: FilterFactory
  /** Bot 运行态标识：WS 连接是否处于活动（start 后 true、stop 后 false） */
  private running = false
  /** 建立当前 client 时的连接参数版本号，与 configService 不一致即表示配置已变更 */
  private clientVersion = 0

  private constructor(options: AppOptions = {}) {
    this.client = options.client ?? createOneBotClientFromEnv()
    this.commandFactory = CommandFactory.getInstance()
    this.filterFactory = FilterFactory.getInstance()
    this.clientVersion = configService.connectionVersion
    this.setupListeners()
  }

  static getInstance(options?: AppOptions) {
    if (!this.instance) {
      this.instance = new App(options)
    }
    return this.instance
  }

  private setupListeners() {
    this.client.on('message', this.handleMessage.bind(this))
  }

  /**
   * 以最新配置重建传输层：
   * WS 客户端从 ConfigService 读取的地址/Token 重新创建并重新绑定监听，
   * HTTP 通道为进程级 axios 单例，原地刷新 baseURL / Authorization 即可。
   */
  private rebuildClient() {
    // 清空旧 client 的监听器，避免残留引用继续消费事件
    this.client.removeAllListeners()
    this.client = createOneBotClientFromEnv()
    this.setupListeners()
    refreshOneBotHttpConfig()
    this.clientVersion = configService.connectionVersion
  }

  private async handleMessage(data: OneBotMessageReceive) {
    try {
      // 1. 过滤层校验
      const passed = this.filterFactory.handleMessage(data)
      if (!passed) return
      const session = new Session(data)
      logger.info('message', session.raw)
      // 2. 命令层执行
      const action = await this.commandFactory.handleMessage(session)
      if (!action) return
      // 3. 分行动作由 ActionRouter 依 type + 会话类型派发到对应发送器
      await session.dispatch(action)
    } catch (e) {
      logger.error(e?.message)
    }
  }

  /** 启动 Bot：建立 WS 连接开始接收消息；已运行则跳过 */
  start() {
    if (this.running) {
      logger.warn('Bot is already running, skip start')
      return
    }
    // 停机期间可能改过连接参数，启动前按最新配置重建传输层
    if (this.isConfigStale) {
      logger.info('Connection config changed while stopped, rebuilding client before start')
      this.rebuildClient()
    }
    this.client.connect()
    this.running = true
    logger.info('Bot started')
  }

  /** 停止 Bot：主动断开 WS 连接，不再接收消息；已停止则跳过 */
  stop() {
    if (!this.running) {
      logger.warn('Bot is already stopped, skip stop')
      return
    }
    this.client.disconnect()
    this.running = false
    logger.info('Bot stopped')
  }

  /** 当前 Bot 是否在运行 */
  get isRunning(): boolean {
    return this.running
  }

  /** 连接参数（requiresRestart 项）是否在建立连接后又被修改：true 表示需重启 Bot 才生效 */
  get isConfigStale(): boolean {
    return this.clientVersion !== configService.connectionVersion
  }

  /**
   * 重启 Bot：断开当前连接，以最新配置重建传输层后重新连上。
   * 供 requiresRestart 类配置（WS 地址 / Token、HTTP 地址 / Token）保存后调用，
   * 无需重启整个进程即可让新参数生效。
   */
  restart() {
    logger.info('Bot restarting with latest config')
    this.stop()
    this.rebuildClient()
    this.start()
  }

  /** 暴露底层 client 以便调用 send 等传输原语（例如未来纯 WS 动作回包） */
  getClient(): OneBotClient {
    return this.client
  }
}

export default App
