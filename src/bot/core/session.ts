
import OneBot from '@/api/common/oneBot'
import { MessageItem, GroupMessageSend, OneBotMessageReceive } from '@/interface/onebot'
import { BeanFactory } from '@/core/bean'
import type { GroupConfig } from '@/beans/group'
import { ActionResult } from '../interface/actoin'

const factory = BeanFactory.getInstance()

export class Session {
  raw: OneBotMessageReceive

  constructor(message: OneBotMessageReceive) {
    this.raw = message
  }

  get messageType() {
    return this.raw.message_type
  }

  get userId() {
    return this.raw.sender?.user_id.toString()
  }

  get groupId() {
    return this.raw.group_id
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
      } catch { /* 解析失败忽略 */ }
    }
    return payloads
  }

  async sendMessage(payload: GroupMessageSend) {
    // console.log(JSON.stringify(payload));
    if (this.raw.message_type == 'group') {
      return await OneBot.sendGroupMsg(payload as any)
    } else if (this.raw.message_type == 'private') {
      return
    }
  }


  


  async dispatch(action: ActionResult) {
    const { type } = action
    switch (type) {
      case 'message':
        return OneBot.sendGroupMsg({ group_id: this.groupId, message: action.items })
      case 'forward-message':
        return
    }

  }





}
