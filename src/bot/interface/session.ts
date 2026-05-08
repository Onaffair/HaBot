import type { Message } from '@/interface/messageReceiveType'
import { postMessage } from '@/api'
import { MessageItemType, MessageSendType } from '@/interface/MessageSendType'
import config from '@config'

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

  get groupMemberNames() {
    if (!this.groupId) return []
    const group = config.group.listen.find(item => item.group_id === this.groupId?.toString())
    return group?.members?.map(item => {
      if (item?.card?.trim() !== '') {
        item.nickname = item?.card
        return item?.card
      } else {
        item.card = item.nickname
        return item?.nickname
      }
    }) || []
  }

  get message() {
    // 简化获取文本内容，实际情况可能需要更复杂的解析
    // const textMsg = this.raw.message?.find(m => m.type === 'text')
    // return textMsg?.data?.text || ''
    return this.raw.message
  }
  
  // 提取纯文本内容，移除@等干扰
  get textContent() {
    return this.raw.message
      ?.filter(item => item.type === 'text')
      .map(item => item?.data?.text || '')
      .join('')
      .trim() || ''
  }

  async sendMessage(payload:MessageSendType){
    return await postMessage(payload)
  }

  // 可以拓展 reply, sendText 等方法
}
