import config from "@/bot.config";
import { MessageItemType } from "@/interface/MessageSendType";

export function getRandomImage(): MessageItemType {
  const msg = {} as MessageItemType
  msg.type = 'image'

  const { images } = config.self
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

export function getText(text: string): MessageItemType {
  const msg = {} as MessageItemType
  msg.type = 'text'
  msg.data = {
    text,
  }
  return msg
}



