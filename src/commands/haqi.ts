import { createCommand } from '@/core/command'
import config from '@/bot.config'
import { MessageSendType } from '@/interface/MessageSendType'
import { getRandomImage } from '@/utils/message'

export default createCommand({
  name: '哈气',
  description: '随机获取一张哈气图片',
  match: (session) => session.textContent == '哈气',
  handle: async (session) => {
    const msg = {} as MessageSendType
    const imageMsg = getRandomImage()

    if (!imageMsg) return

    msg.group_id = session.groupId.toString()
    msg.message = [imageMsg]

    console.log('[HaQi] Sending image:', imageMsg.data.file)
    
    await session.sendMessage(msg)
  }
})
