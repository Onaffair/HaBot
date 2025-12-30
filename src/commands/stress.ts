import { createCommand } from '@/core/command'
import config from '@/bot.config'
import { MessageSendType } from '@/interface/MessageSendType'
import { getAt, getMessage, getRandomImage, getText } from '@/utils/message'

export default createCommand({
  name: '应激',
  description: '发送的内容中带有哈气时会使耄耋应激',
  match: (session) => {
    const text = session.textContent
    return text.includes('哈气') && text.trim().length > 2
  },
  handle: async (session) => {
    const msg = getMessage()
    const imageMsg = getRandomImage('stress')
    const sender = session.userId
    const atMsg = getAt(sender)
    if (!imageMsg) return
    const stressMsg = getText(`
你刚才提到了哈气？
还有什么比哈气更有意思的事情吗？`)
    msg.group_id = session.groupId.toString()
    msg.message = [atMsg, stressMsg, imageMsg,]

    console.log('[HaQi] Sending image:', imageMsg.data.file)

    await session.sendMessage(msg)
  }
})
