import { BeanFactory } from '@/core/bean';
import { MessageItemType, MessageSendType } from "@/interface/MessageSendType";
import { Session } from "@/interface/session";
import { createLogger } from '@utils/logger'
import type { ResourceConfig } from '@/beans/resource.bean';

const factory = BeanFactory.getInstance()
const logger = createLogger('MessageUtils')

export function makeRandomResource(folder:string, name?: string): MessageItemType {
  const resource = factory.getBeanValue<ResourceConfig>('resource')
  const targetFolder = resource?.folder?.find(f => f.name === folder)
  let items = targetFolder?.children || []
  // console.log(items);
  
  if (name) {
    const found = items.find(t => t.includes(name))
    items = found ? [found] : []
  }
  if (!items || items.length === 0) {
    logger.warn('No resource configured')
    return
  }
  const randIndex = Math.floor(Math.random() * items.length)
  const url = items[randIndex]

  const msg = {} as MessageItemType
  // // 根据文件扩展名判断消息类型
  if (/\.(mp3|wav|ogg|amr|silk)$/i.test(url)) {
    msg.type = 'record'
  } else {
    msg.type = 'image'
  }
  msg.data = { file: url }
  return msg
}

export function makeVoiceMsg(url: string) {
  const msg = {} as MessageItemType
  msg.type = 'record'
  msg.data = {
    file: url,
  }
  return msg
}
export function makeTextMsg(text: string): MessageItemType {
  const msg = {} as MessageItemType
  msg.type = 'text'
  msg.data = {
    text,
  }
  return msg
}

export function makeReplyMsg(id: string) {
  const msg = {} as MessageItemType
  msg.type = 'reply'
  msg.data = {
    id
  }
  return msg
}

export function makeAtMsg(qq: string): MessageItemType {
  const msg = {} as MessageItemType
  msg.type = 'at'
  msg.data = {
    qq,
  }
  return msg
}

export function makeImageMsg(url: string) {
  const msg = {} as MessageItemType
  msg.type = 'image'
  msg.data = {
    file: url,
    url: url,
  }
  return msg
}


export function makeMessageInstance(): MessageSendType {
  return { message: [] } as MessageSendType
}

export function judgeIsAtMe(session: Session) {
  const me = factory.getBeanValue<string>('me')
  return session.message.some(m => m?.type === 'at' && m?.data?.qq === me)
}
