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

/**
 * 动态命令的扩展标识，用于运行时精确增删某个来源注册的命令。
 * syncKey 形如 `managed-resource:12`，保证幂等注册与精准移除，避免误伤其它命令。
 */
export interface DynamicCommandExt {
  /** 命令来源，如 'managed-resource' */
  source: string;
  /** 来源记录 ID（如资源段 id） */
  sourceId: string | number;
  /** 唯一标识：`${source}:${sourceId}`，作为 registry/remove 的 key */
  syncKey: string;
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
    const syncKey = cmd.ext?.syncKey
    if (syncKey) {
      // 同 syncKey 命令已存在则先移除，保证动态命令幂等（避免重复注册同一资源段）
      this.removeBySyncKey(syncKey)
    }
    this.commands.push(cmd)
    this.commands.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    logger.info(`command ${cmd.name} registered${syncKey ? ` (${syncKey})` : ''}`)
  }

  /** 依据动态命令的唯一 syncKey 移除已注册命令，返回是否移除成功 */
  removeBySyncKey(syncKey: string): boolean {
    const idx = this.commands.findIndex((c) => c.ext?.syncKey === syncKey)
    if (idx === -1) return false
    const [removed] = this.commands.splice(idx, 1)
    logger.info(`command ${removed.name} removed (${syncKey})`)
    return true
  }

  /** 是否存在指定 syncKey 的动态命令 */
  hasSyncKey(syncKey: string): boolean {
    return this.commands.some((c) => c.ext?.syncKey === syncKey)
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
