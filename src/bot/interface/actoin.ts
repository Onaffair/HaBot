import { MessageItem } from "./onebot"

/**
 * 命令处理返回的动作。
 * ActionRouter 按 type + 会话类型（group/private）分派到对应发送器；
 * 新增动作类型时在此扩展联合，并在 core/actionRouter 注册对应 handler。
 */
export type ActionResult =
  | { type: 'message'; items: MessageItem[] }
  | { type: 'forward-message'; data: { messages: MessageItem[] } }
