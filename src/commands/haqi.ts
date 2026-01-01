import { createCommand } from '@/core/command'
import config from '@/bot.config'
import { getMessageSendTypeInstance, MessageSendType } from '@/interface/MessageSendType'
import { makeRandomImage } from '@/utils/message'

export default createCommand({
  name: '哈气',
  description: '随机获取一张哈气图片',
  match: (session) => session.textContent == '哈气',
  handle: async (session) => {
    const msg = getMessageSendTypeInstance(session)
    const imageMsg = makeRandomImage()

    if (!imageMsg) return

    msg.group_id = session.groupId.toString()
    msg.message.push(imageMsg)

    console.log('[HaQi] Sending image:', imageMsg.data.file)

    await session.sendMessage(msg)
      .then(res => {
        console.log(res);

      })

  },
  priority: 9
})
