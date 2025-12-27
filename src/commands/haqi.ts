import { createCommand } from '@/core/command'
import config from '@/bot.config'
import { MessageSendType } from '@/interface/MessageSendType'
import { getRandomImage } from '@/utils/message'

export default createCommand({
  name: '哈气',
  description: '随机发送一张猫猫图片',
  match: (session) => session.textContent == '哈气',
  handle: async (session) => {
    const { images } = config.self
    if (!images || images.length === 0) {
        console.warn('[HaQi] No images configured')
        return
    }
    const randIndex = Math.floor(Math.random() * images.length)
    const url = images[randIndex]

    const msg = {} as MessageSendType

    msg.group_id = session.groupId.toString()
    msg.message = [getRandomImage()]

    console.log('[HaQi] Sending image:', url)
    
    await session.sendMessage(msg)
  }
})
