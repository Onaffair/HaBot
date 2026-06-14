import BotClient from '@/utils/websocket'
import { Command, CommandFactory } from './command'
import { Session } from '../interface/session'
import type { Message } from '@/interface/messageReceiveType'
import { Filter, FilterFactory } from './filter'

import { createLogger } from '@utils/logger'
import { getMessageSendTypeInstance, MessageItemType } from '@/interface/MessageSendType'

const logger = createLogger('App')

class App {
  static instance: App

  private client: BotClient
  private commandFactory: CommandFactory
  private filterFactory: FilterFactory

  private constructor() {
    this.client = new BotClient()
    this.commandFactory = CommandFactory.getInstance()
    this.filterFactory = FilterFactory.getInstance()
    this.setupListeners()
  }


  static getInstance() {
    if (!this.instance) {
      this.instance = new App()
    }
    return this.instance
  }


  private setupListeners() {
    // 监听所有消息，统一处理
    this.client.on('message', this.handleMessage.bind(this))
  }
  private async handleMessage(data: Message) {
    try {
      // 1. 过滤层校验
      const passed = this.filterFactory.handleMessage(data)
      if (!passed) return 
      const session = new Session(data)
      // 2. 命令层执行
      const messages = await this.commandFactory.handleMessage(session)
      if (!messages) return

      // 3.返回会话消息
      const msg = getMessageSendTypeInstance(session)
      msg.message.push(...messages)
      await session.sendMessage(msg)
    } catch (e) {
      logger.error(e?.message)
    }
  }
  start() {
    this.client.connect()
  }
}

export default App
