import type { Message } from '@/interface/messageReceiveType'
import { postMessage } from '@/api'
import { MessageItemType, MessageSendType } from '@/interface/MessageSendType'
import { BeanFactory } from '@/core/bean'
import type { GroupConfig } from '@/beans/group.bean'

const factory = BeanFactory.getInstance()

export class Session {
  raw: Message

  constructor(message: Message) {
    this.raw = message
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

  async sendMessage(payload: MessageSendType) {
    // console.log(JSON.stringify(payload));

    return await postMessage(payload)
  }
}
