import type { AgentTool } from '../type'
import { ToolManager } from '../type'
import { createLogger } from '@utils/logger'
import { userProfileService } from '@/services/db/userProfile'

const logger = createLogger('CommonTool')

// ============================================================================
// 通用工具
// ----------------------------------------------------------------------------
// 目前包含角色画像查询：
//   - get_character_profile：按 QQ 号查询对应角色的数字画像，返回昵称与
//     AI 生成的人物画像描述（用于让 AI 了解某位群友的性格、习惯、梗等）。
// 工具只读、失败降级为带 error 的对象而非抛出，保证对话循环不中断。
// ============================================================================

const commonTools: AgentTool[] = [
  {
    name: 'get_character_profile',
    description: '根据 QQ 号查询对应角色的人物画像（数字画像总结），返回该角色的昵称/群名片与 AI 生成的人物画像描述，包括性格、说话习惯、常聊话题、熟人关系等。当你需要了解某个 QQ 号的角色设定、回忆某人的特征或关系时使用；查不到时返回 not_found。',
    parameters: {
      type: 'object',
      properties: {
        qq: {
          type: 'string',
          description: '目标角色的 QQ 号',
        },
      },
      required: ['qq'],
    },
    execute: async ({ qq }: { qq: string }) => {
      const id = String(qq ?? '').trim()
      if (!id) return { qq: id, error: 'qq 不能为空' }
      try {
        const row = await userProfileService.findByQq(id)
        if (!row) {
          return { qq: id, found: false, message: '暂无该角色的人物画像' }
        }
        return {
          qq: id,
          found: true,
          nickname: row.nickname || '',
          profile: row.profile || '',
          ...(row.profile ? {} : { message: '该角色已记录但暂无画像描述' }),
        }
      } catch (e: any) {
        logger.error('get_character_profile failed', e)
        return { qq: id, found: false, error: e?.message || String(e) }
      }
    },
  },
]

const toolManager = ToolManager.getInstace()
commonTools.forEach((tool) => toolManager.register(tool))
