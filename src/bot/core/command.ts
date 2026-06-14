import { Session } from '../interface/session'
import { getMessageSendTypeInstance, MessageItemType } from '../interface/MessageSendType'
import { createLogger } from '@/utils/logger';

export interface Command {
  name: string,
  match: (session: Session) => boolean | Promise<boolean>,
  handle: (session: Session) => MessageItemType[] | undefined | Promise<MessageItemType[] | undefined>;
  description?: string,
  priority?: number,
  ext?: any,
}
const logger = createLogger('Command')
export class CommandFactory {

  private static instance: CommandFactory;
  private commands: Command[];

  private constructor() {
    this.commands = []
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new CommandFactory()
    }
    return this.instance
  }

  registry(cmd: Command) {
    this.commands.push(cmd)
    logger.info(`command ${cmd.name} registered`)
  }

  getCommand() {
    return this.commands.sort((a, b) => a.priority - b.priority)
  }

  async handleMessage(session: Session) {
    for (const cmd of this.commands) {
      if (await cmd.match(session)) {
        logger.info(`Match command: ${cmd.name}`)
        try {
          return await cmd.handle(session)
        } catch (e) {
          logger.error(`Command execution failed (${cmd.name}):`, e)
        }
        return // 匹配到一个命令后停止，或者根据需求继续
      }
    }
  }



}
