import { Command, CommandFactory } from '@/core/command'
import { makeTextMsg } from '@/utils/message'

const maodieCmd: Command = {
  name: '耄耋',
  description: '查看所有可用指令',
  match: (session) => session.textContent === '耄耋',
  handle: async (session) => {
    const commands = CommandFactory.getInstance().getCommand()
    const helpText = commands.map(cmd => {
      return `【${cmd.name}】 ${cmd.description || ''}`
    }).join('\n')

    return [makeTextMsg(
      `耄耋在！
      当前可用指令：\n${helpText}`
    )]
  }
}
const fac = CommandFactory.getInstance()
fac.registry(maodieCmd)

