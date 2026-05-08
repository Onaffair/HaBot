import config from '@config';
import { MessageItemType, MessageSendType } from "@/interface/MessageSendType";
import { Session } from "@/interface/session";
import { createLogger } from '@utils/logger'

const logger = createLogger('MessageUtils')

export function makeRandomImage(name: string = 'cat'): MessageItemType {
  const msg = {} as MessageItemType
  msg.type = 'image'

  const catResource = config.resource.folder.find(f => f.name === name)
  const images = catResource?.children

  if (!images || images.length === 0) {
    logger.warn('No images configured')
    return
  }
  const randIndex = Math.floor(Math.random() * images.length)
  const url = images[randIndex]

  msg.data = {
    file: url,
  }

  return msg
}

export function makeRandomVoice(name = 'cat_voice') {
  const msg = {} as MessageItemType
  msg.type = 'record'

  const catResource = config.resource.folder.find(f => f.name === name)
  const voices = catResource?.children

  if (!voices || voices.length === 0) {
    logger.warn('No images configured')
    return
  }
  const randIndex = Math.floor(Math.random() * voices.length)
  const url = voices[randIndex]

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
  }
  return msg
}


export function makeMessageInstance(): MessageSendType {
  return { message: [] } as MessageSendType
}

export function judgeIsAtMe(session: Session) {
  return session.message.some(m => m?.type === 'at' && m?.data?.qq === config.me)
}
