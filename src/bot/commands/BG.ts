import { createCommand } from "@/core/command";
import { makeImageMsg } from "@/utils/message";
import config from "@config";
import { createLogger } from "@utils/logger";


const logger = createLogger('BG')

export default createCommand({
  name: ' ?',
  description: '?',
  match: (session) => session.textContent.includes('涩图'),
  handle: async (session) => {
    const { BG } = config
    const randIndex = Math.floor(Math.random() * BG.length)
    const url = BG[randIndex]

    const imageMsg = makeImageMsg(url)
    logger.info('[BG] Sending image:', url)

    return [imageMsg]
  }
})