import { Command, CommandFactory } from "@/core/command";
import { makeImageMsg } from "@/utils/message";
import { BeanFactory } from '@/core/bean';
import { createLogger } from "@utils/logger";

const factory = BeanFactory.getInstance()
const logger = createLogger('BG')

const BGCmd: Command = {
  name: ' ?',
  description: '?',
  match: (session) => session.textContent.includes('涩图'),
  handle: async (session) => {
    const BG = factory.getBeanValue<string[]>('BG') || []
    if (!BG.length) return
    const randIndex = Math.floor(Math.random() * BG.length)
    const url = BG[randIndex]
    const imageMsg = makeImageMsg(url)
    logger.info('[BG] Sending image:', url)

    return [imageMsg]
  }
}
const fac = CommandFactory.getInstance()
fac.registry(BGCmd)
