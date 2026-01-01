import BotClient from '@/utils/websocket'
import { Command } from './command'
import { Session } from '../interface/session'
import type { Message } from '@/interface/messageReceiveType'
import config from '@/bot.config'
import { Filter } from './filter'

import { initializer } from './initializer'

export class App {
  private client: BotClient
  private commands: Command[] = []
  private filters: Filter[] = []
  constructor() {
    this.client = new BotClient()
    this.setupListeners()
  }

  private setupListeners() {
    // 监听所有消息，统一处理
    this.client.on('message', this.handleMessage.bind(this))
  }

  registerCommand(cmd: Command) {
    this.commands.push(cmd)
    console.log(`[App] Command registered: ${cmd.name}`)
    return this
  }

  get commandList() {
    return this.commands
  }

  registerFilter(filter: Filter) {
    this.filters.push(filter)
    console.log(`[App] Filter registered: ${filter.name}`)
    return this
  }

  private async handleMessage(data: Message) {
    // 1. 过滤层校验
    for (const filter of this.filters) {
      try {
        const passed = filter.match(data)
        if (!passed) {
          // console.log(`[App] Filter blocked: ${filter.name}`)
          return
        }
      } catch (e) {
        console.error(`[App] Filter execution failed (${filter.name}):`, e)
        return
      }
    }

    // 2. 命令层执行
    const session = new Session(data)

    // 遍历命令进行匹配
    for (const cmd of this.commands) {
      if (await cmd.match(session)) {
        console.log(`[App] Match command: ${cmd.name}`)
        try {
          await cmd.handle(session)
        } catch (e) {
          console.error(`[App] Command execution failed (${cmd.name}):`, e)
        }
        return // 匹配到一个命令后停止，或者根据需求继续
      }
    }
  }

  start() {
    this.client.connect()
    // 初始化资源和群成员
    initializer.init()
  }
}

export const app = new App()
