import { Session } from './session'
import { ActionResult } from '../interface/actoin'
import { createLogger } from '@/utils/logger';

export interface Command {
  name: string,
  match: (session: Session) => boolean | Promise<boolean>,
  handle: (session: Session) => ActionResult | undefined | Promise<ActionResult | undefined>;
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
    this.commands.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    logger.info(`command ${cmd.name} registered`)
    // console.log(this.commands.map(t => t?.priority).filter(t => t == 0 || t));

  }

  getCommand() {
    return this.commands.sort((a, b) => b?.priority - a?.priority)
  }
  async handleMessage(session: Session): Promise<ActionResult> | undefined | null {
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
