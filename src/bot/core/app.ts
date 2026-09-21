import { CommandFactory } from './command'
import { Session } from './session'
import { OneBotMessageReceive } from '@/interface/onebot'
import { FilterFactory } from './filter'
import { OneBotClient, createOneBotClientFromEnv } from './oneBotClient'

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

  private constructor(options: AppOptions = {}) {
    this.client = options.client ?? createOneBotClientFromEnv()
    this.commandFactory = CommandFactory.getInstance()
    this.filterFactory = FilterFactory.getInstance()
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

  start() {
    this.client.connect()
  }

  /** 暴露底层 client 以便调用 send 等传输原语（例如未来纯 WS 动作回包） */
  getClient(): OneBotClient {
    return this.client
  }
}

export default App
