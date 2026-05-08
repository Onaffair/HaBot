import { createCommand } from "@/core/command";
import { getMessageSendTypeInstance } from "@/interface/MessageSendType";
import { judgeIsAtMe, makeImageMsg, makeMessageInstance } from "@/utils/message";
import config from "@config";
import { createLogger } from "@utils/logger";


const logger = createLogger('BG')

export default createCommand({
  name: ' ?',
  description: '?',
  match: (session) => session.textContent.includes('涩图'),
  handle: async (session) => {
    const msg = getMessageSendTypeInstance(session)
    const { BG } = config
    const randIndex = Math.floor(Math.random() * BG.length)
    const url = BG[randIndex]

    const imageMsg = makeImageMsg(url)
    msg.message.push(imageMsg)
    logger.info('[BG] Sending image:', url)

    await session.sendMessage(msg)
  }
})