import { ActionResult } from '@/interface/actoin'
import type { Session } from './session'
import { createLogger } from '@utils/logger'

/** 会话类型：与 OneBot 的 message_type 对齐 */
export type SessionKind = 'group' | 'private'

/** 单个动作在指定会话类型下的发送器 */
export type ActionHandler<A extends ActionResult = ActionResult> = (
  session: Session,
  action: A,
) => Promise<any>

/** 动作类型 -> 会话类型 -> 处理函数 的两级路由表 */
type ActionTable = Map<ActionResult['type'], Partial<Record<SessionKind, ActionHandler>>>

const logger = createLogger('ActionRouter')

/**
 * 动作分发路由。
 *
 * 命令层返回 ActionResult，Session.dispatch 转交本路由，
 * 由 type + 会话类型（group/private）二维键查到具体发送器执行。
 * 新增动作类型时在此文件末尾追加注册即可，无需改动 Session/App。
 */
export class ActionRouter {
  private static instance: ActionRouter
  private table: ActionTable

  private constructor() {
    this.table = new Map()
  }

  static getInstance(): ActionRouter {
    if (!this.instance) this.instance = new ActionRouter()
    return this.instance
  }

  /** 注册某个动作类型在指定会话类型下的处理器 */
  register(type: ActionResult['type'], kind: SessionKind, handler: ActionHandler): void {
    const kinds = this.table.get(type) ?? {}
    kinds[kind] = handler
    this.table.set(type, kinds)
    logger.info(`action handler registered: ${type}/${kind}`)
  }

  /** 未命中或当前会话类型无对应处理器时返回 undefined，不抛错 */
  async dispatch(session: Session, action: ActionResult): Promise<any> {
    const kinds = this.table.get(action.type)
    if (!kinds) {
      logger.warn(`no action handler for type: ${action.type}`)
      return
    }
    const handler = kinds[session.kind]
    if (!handler) {
      logger.warn(`no action handler for ${action.type} in ${session.kind} session`)
      return
    }
    return handler(session as any, action as any)
  }
}

// ============================================================================
// 默认动作注册：新增 ActionResult 类型时在此追加，保持动作发送器与类型联合同步
// ============================================================================
const router = ActionRouter.getInstance()

router.register('message', 'group', (session, action: any) =>
  session.sendItems(action.items),
)
router.register('message', 'private', (session, action: any) =>
  session.sendItems(action.items),
)
router.register('forward-message', 'group', (session, action: any) =>
  session.sendForward(action.data?.messages ?? []),
)
router.register('forward-message', 'private', (session, action: any) =>
  session.sendForward(action.data?.messages ?? []),
)

export default ActionRouter
