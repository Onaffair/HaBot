import { Command } from "@/core/command";
import { MessageBuilder } from "@/utils/message";
import { BeanFactory } from '@/core/bean';
import { createLogger } from "@/utils/logger";

const factory = BeanFactory.getInstance()
const logger = createLogger('BG')

export const BGCmd: Command = {
  name: ' ?',
  description: '?',
  match: (session) => session.textContent.includes('涩图'),
  handle: async (session) => {
    const BG = factory.getBeanValue<string[]>('BG') || []
    if (!BG.length) return
    const randIndex = Math.floor(Math.random() * BG.length)
    const url = BG[randIndex]
    logger.info('[BG] Sending image:', url)

    return MessageBuilder.message().image(url).build()
  }
}
