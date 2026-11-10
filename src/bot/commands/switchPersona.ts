import { Command } from '@/core/command'
import { MessageBuilder, judgeIsAtMe } from '@/utils/messageBuilder'
import { aiPersonaService } from '@/services/db'
import { createLogger } from '@utils/logger'

const logger = createLogger('SwitchPersona')

// ========== 切换人设命令 ==========
// 触发形式：@机器人 + "切换人设" + 人设名称（如「@耄耋 切换人设 大肥鱼」）。
// 命中后把数据库中该人设为当前生效人格（互斥由服务层保证）并回复确认；
// 若数据库没有该人设则不做处理（不切换、不回复）。
// 优先级 1：高于 aiChat(-1)，确保 @ 场景下先于聊天兜底命中。
const TRIGGER = '切换人设'

/** 剥离触发词后取剩余文本作为人设名称 */
function parsePersonaName(text: string): string {
  return text.slice(text.indexOf(TRIGGER) + TRIGGER.length).trim()
}

export const switchPersonaCmd: Command = {
  name: '切换人设',
  description: '@耄耋 切换人设 <人设名称>：切换当前生效的 AI 人格',
  priority: 1,
  match: (session) => {
    if (!judgeIsAtMe(session)) return false
    // 需以触发词开头且带有非空人设名称才接管
    return session.textContent.startsWith(TRIGGER) && !!parsePersonaName(session.textContent)
  },
  handle: async (session) => {
    const name = parsePersonaName(session.textContent)
    const persona = await aiPersonaService.findByName(name)
    // 数据库无此人设：不做处理
    if (!persona) {
      logger.info(`persona not found, ignore: ${name}`)
      return
    }
    await aiPersonaService.setActive(persona.id)
    logger.info(`persona switched: ${persona.name} (id=${persona.id})`)
    return MessageBuilder.message()
      // .at(session.userId)
      .text(`\n已切换到${persona.name}人格`)
      .build()
  },
}
