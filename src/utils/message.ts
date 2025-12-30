import config from "@/bot.config";
import { MessageItemType, MessageSendType } from "@/interface/MessageSendType";

export function getRandomImage(name: string = 'cat'): MessageItemType {
  const msg = {} as MessageItemType
  msg.type = 'image'

  const catResource = config.resource.folder.find(f => f.name === name)
  const images = catResource?.children

  if (!images || images.length === 0) {
    console.warn('[HaQi] No images configured')
    return
  }
  const randIndex = Math.floor(Math.random() * images.length)
  const url = images[randIndex]

  msg.data = {
    file: url,
  }

  return msg
}

export function getRandomVoice() {
  const msg = {} as MessageItemType
  msg.type = 'record'

  const catResource = config.resource.folder.find(f => f.name === 'cat_voice')
  const voices = catResource?.children

  if (!voices || voices.length === 0) {
    console.warn('[HaQi] No images configured')
    return
  }
  const randIndex = Math.floor(Math.random() * voices.length)
  const url = voices[randIndex]

  msg.data = {
    file: url,
  }

  return msg
}
export function getText(text: string): MessageItemType {
  const msg = {} as MessageItemType
  msg.type = 'text'
  msg.data = {
    text,
  }
  return msg
}


export function getAt(qq: string): MessageItemType {
  const msg = {} as MessageItemType
  msg.type = 'at'
  msg.data = {
    qq,
  }
  return msg
}

export function getMessage(): MessageSendType {
  return { message: [] } as MessageSendType
}

