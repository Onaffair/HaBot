import { Command, CommandFactory } from '@/core/command'
import { MessageBuilder } from '@/utils/message'

/** 菜单命令：列出当前已注册的全部命令，由 index 按需显式注册 */
export const maodieCmd: Command = {
  name: '耄耋',
  description: '查看所有可用指令',
  match: (session) => session.textContent === '耄耋',
  handle: async (session) => {
    const commands = CommandFactory.getInstance().getCommand()
    const helpText = commands.map(cmd => {
      return `【${cmd.name}】 ${cmd.description || ''}`
    }).join('\n')

    return MessageBuilder.message().text(
      `耄耋在！
      当前可用指令：\n${helpText}`,
    ).build();
  }
}

