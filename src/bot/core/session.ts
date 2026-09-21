import OneBot from '@/api/common/oneBot'
import { MessageItem, GroupMessageSend, OneBotMessageReceive } from '@/interface/onebot'
import { BeanFactory } from '@/core/bean'
import type { GroupConfig } from '@/beans/group'
import { ActionResult } from '@/interface/actoin'
import { ActionRouter, SessionKind } from '@/core/actionRouter'

const factory = BeanFactory.getInstance()

/**
 * 单次消息会话上下文。
 *
 * 除承载原始消息与派生属性外，还提供一组会话感知的 OneBot 便捷方法：
 * 业务代码在 handle(session) 中通过 session.sendXxx 直接完成响应，
 * 无需再手工传入 group_id / user_id。与当前会话无关的全局管理接口
 * （如 getLoginInfo / getGroupList）仍保留在 OneBot 静态类上。
 */
export class Session {
  raw: OneBotMessageReceive

  constructor(message: OneBotMessageReceive) {
    this.raw = message
  }

  /** 工厂方法：预留未来注入依赖的接入点，业务侧统一经此创建 */
  static create(message: OneBotMessageReceive): Session {
    return new Session(message)
  }

  get messageType() {
    return this.raw.message_type
  }

  /** 会话类型（ActionRouter 二级路由键） */
  get kind(): SessionKind {
    return this.raw.message_type === 'group' ? 'group' : 'private'
  }

  get isGroup() {
    return this.kind === 'group'
  }

  get isPrivate() {
    return this.kind === 'private'
  }

  get userId() {
    return this.raw.sender?.user_id.toString()
  }

  get groupId() {
    return this.raw.group_id
  }

  /** 当前会话的回复目标 id：群聊为 group_id，私聊为 user_id */
  get targetId(): string | number {
    return this.isGroup ? this.raw.group_id : (this.raw.user_id ?? this.raw.sender?.user_id)
  }

  /** 返回群成员名称列表（card 优先，否则 nickname），无副作用 */
  get groupMemberNames() {
    if (!this.groupId) return []
    const group = factory.getBeanValue<GroupConfig>('group')
    const groupInfo = group?.listen?.find(
      (item) => item.group_id === this.groupId?.toString(),
    )
    return (
      groupInfo?.members?.map((item) =>
        item?.card?.trim() !== '' ? item.card : item.nickname,
      ) || []
    )
  }

  get message() {
    return this.raw.message
  }

  /** 提取纯文本内容（去除 @ 等非文本消息） */
  get textContent() {
    return (
      this.raw.message
        ?.filter((item) => item.type === 'text')
        .map((item) => item?.data?.text || '')
        .join('')
        .trim() || ''
    )
  }

  /** 解析 json 消息段（如 QQ 小程序分享），返回还原转义后的 payload 列表 */
  get jsonPayloads(): any[] {
    const payloads: any[] = []
    for (const item of this.raw.message ?? []) {
      if (item.type !== 'json') continue
      try {
        const payload = JSON.parse(item.data?.data as string)
        if (payload) payloads.push(payload)
      } catch { /* 解析失败忽略该消息段 */ }
    }
    return payloads
  }

  // ==========================================================================
  // 会话感知的 OneBot 便捷方法
  // ==========================================================================

  /** 发送消息段列表到当前会话（自动按 kind 选群/私聊接口） */
  async sendItems(items: MessageItem[]) {
    if (this.isGroup) {
      return OneBot.sendGroupMsg({ group_id: this.groupId, message: items })
    }
    return OneBot.sendPrivateMsg({ user_id: this.targetId as any, message: items })
  }

  /** 发送纯文本 */
  async sendText(text: string) {
    return this.sendItems([{ type: 'text', data: { text } } as any])
  }

  /** 发送合并转发消息 */
  async sendForward(messages: any[]) {
    if (this.isGroup) {
      return OneBot.sendGroupForwardMsg({ group_id: this.groupId, data: { messages } })
    }
    return OneBot.sendPrivateForwardMsg({ user_id: this.targetId as any, data: { messages } })
  }

  /** 获取任意消息原文（如 reply 消息段指向的原消息） */
  async getMsg(messageId: number) {
    return OneBot.getMsg({ message_id: messageId })
  }

  /** 撤回当前会话中的某条消息 */
  async recall(messageId: number) {
    return OneBot.deleteMsg({ message_id: messageId })
  }

  /** 当前会话群成员列表（私聊返回空） */
  async getGroupMemberList() {
    if (!this.isGroup) return []
    return OneBot.getGroupMemberList({ group_id: this.groupId })
  }

  /** 群禁言当前会话中的某成员（私聊无副作用返回 undefined） */
  async banMember(userId: string | number, duration = 600) {
    if (!this.isGroup) return
    return OneBot.setGroupBan({ group_id: this.groupId, user_id: userId, duration })
  }

  /**
   * @deprecated 保留兼容旧 payload 结构调用，改用 sendItems / dispatch(action)。
   */
  async sendMessage(payload: GroupMessageSend) {
    if (this.raw.message_type == 'group') {
      return await OneBot.sendGroupMsg(payload as any)
    } else if (this.raw.message_type == 'private') {
      return
    }
  }

  /**
   * 命令返回的 ActionResult 统一入口：交由 ActionRouter 依 type + kind 分派。
   */
  async dispatch(action: ActionResult) {
    return ActionRouter.getInstance().dispatch(this, action)
  }
}
