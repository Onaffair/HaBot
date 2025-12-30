import { createCommand } from '@/core/command'
import { app } from '@/core/app'
import { getText } from '@/utils/message'
import { MessageSendType } from '@/interface/MessageSendType'

export default createCommand({
  name: '指令集',
  description: '查看所有可用指令',
  match: (session) => session.textContent === '指令集',
  handle: async (session) => {
    const commands = app.commandList
    const helpText = commands.map(cmd => {
      return `【${cmd.name}】 ${cmd.description || ''}`
    }).join('\n')

    const msg = {} as MessageSendType
    if (session.groupId) {
      msg.group_id = session.groupId.toString()
    }

    msg.message = [getText(`当前可用指令：\n${helpText}`)]

    await session.sendMessage(msg)
  }
})
