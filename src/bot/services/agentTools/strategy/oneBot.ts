import OneBot from "@/api/common/oneBot";
import type { MessageItem, OB11Message } from "@/interface/onebot";
import { AgentTool, ToolManager } from "../type";
import { createLogger } from "@utils/logger";
import { MessageContentParser } from "@utils/messageContent";

const logger = createLogger('OneBotTool');

/** 群聊历史单次返回条数上限，避免把整屏消息灌进上下文 */
const MAX_HISTORY_COUNT = 50;
/** 群历史默认返回条数 */
const DEFAULT_HISTORY_COUNT = 20;

// ============================================================================
// 输出整形辅助：工具结果会被序列化后塞回对话上下文，故统一精简为
// AI 关心的字段，失败降级为带 error 的对象而非抛出；
// 消息内容解析委托给 utils/messageContent（MessageContentParser），
// 由其统一负责文本/图片/语音等消息段转换，并递归展开合并转发。
// ============================================================================

/** 秒级时间戳转本地可读时间：YYYY-MM-DD HH:mm */
function formatTime(sec?: number): string {
  if (!sec) return ''
  const d = new Date(sec * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 兼容 getGroupMsgHistory 的多种返回形态，取出消息数组 */
function pickMessages(res: any): OB11Message[] {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.messages)) return res.messages
  if (Array.isArray(res?.data?.messages)) return res.data.messages
  return []
}

/** 群成员信息精简：只保留 AI 判断所需的展示字段 */
function toMemberBrief(m: any) {
  return {
    qq: String(m.user_id ?? ''),
    nickname: m.nickname ?? '',
    card: m.card ?? '',
    role: m.role ?? 'member',
    title: m.title ?? '',
    level: m.level ?? '',
    sex: m.sex ?? '',
    age: m.age ?? '',
    area: m.area ?? '',
    join_time: m.join_time ? formatTime(m.join_time) : '',
    is_robot: !!m.is_robot,
  }
}

const oneBotToolArr: AgentTool[] = [
  {
    name: 'get_group_member_list',
    description: '获取群成员列表，返回精简信息（QQ、昵称、群名片、群角色、头衔、等级、性别、年龄、所在地、入群时间）；可按关键词过滤',
    parameters: {
      type: 'object',
      properties: {
        group_id: { type: 'string' as const, description: '群组号' },
        keyword: { type: 'string' as const, description: '可选：按昵称/群名片/QQ 过滤，仅返回包含该关键词的成员' },
      },
      required: ['group_id'],
    },
    execute: async ({ group_id, keyword }: { group_id: string, keyword?: string }) => {
      try {
        const list = (await OneBot.getGroupMemberList({ group_id })) || []
        const brief = list.map(toMemberBrief)
        const members = keyword
          ? brief.filter((m) => `${m.nickname}${m.card}${m.qq}`.includes(keyword))
          : brief
        return { group_id, total: members.length, members }
      } catch (e: any) {
        logger.error('get_group_member_list failed', e)
        return { group_id, error: e?.message || String(e) }
      }
    },
  },
  {
    name: 'get_group_member_info',
    description: '查询指定群成员的信息（昵称、群名片、群角色、头衔、等级、性别、年龄、所在地、入群时间等）',
    parameters: {
      type: 'object',
      properties: {
        group_id: { type: 'string' as const, description: '群组号' },
        user_id: { type: 'string' as const, description: '要查询的成员 QQ 号' },
      },
      required: ['group_id', 'user_id'],
    },
    execute: async ({ group_id, user_id }: { group_id: string, user_id: string }) => {
      try {
        const info: any = await OneBot.getGroupMemberInfo({ group_id, user_id })
        if (!info || info.user_id == null) {
          return { group_id, user_id, found: false, message: '未查询到该群成员' }
        }
        return { group_id, user_id, found: true, member: toMemberBrief(info) }
      } catch (e: any) {
        logger.error('get_group_member_info failed', e)
        return { group_id, user_id, found: false, error: e?.message || String(e) }
      }
    },
  },
  {
    name: 'get_group_chat_history',
    description: '查询群聊的历史聊天记录，返回最近的若干条（按时间倒序），每条含发送人昵称/QQ、时间与可读文本',
    parameters: {
      type: 'object',
      properties: {
        group_id: { type: 'string' as const, description: '群组号' },
        count: { type: 'number' as const, description: `返回最近消息条数，默认 ${DEFAULT_HISTORY_COUNT}，最多 ${MAX_HISTORY_COUNT}` },
      },
      required: ['group_id'],
    },
    execute: async ({ group_id, count }: { group_id: string, count?: number }) => {
      try {
        const limit = Math.min(Math.max(Number(count) || DEFAULT_HISTORY_COUNT, 1), MAX_HISTORY_COUNT)
        const res = await OneBot.getGroupMsgHistory({ group_id, count: limit })
        const picked = pickMessages(res)
          .slice()
          .sort((a, b) => (b.time || 0) - (a.time || 0))
          .slice(0, limit)
        const messages: { time: string, qq: string, name: string, content: any[] }[] = []
        for (const m of picked) {
          // 统一归一为消息段数组交给 MessageContentParser（字符串按纯文本处理）
          const items: MessageItem[] = Array.isArray(m.message)
            ? m.message
            : (m.message ? [{ type: 'text', data: { text: String(m.message) } } as MessageItem] : [])
          messages.push({
            time: formatTime(m.time),
            qq: String(m.sender?.user_id ?? m.user_id ?? ''),
            name: m.sender?.card || m.sender?.nickname || '',
            content: await MessageContentParser.extract(items),
          })
        }
        return { group_id, count: messages.length, messages }
      } catch (e: any) {
        logger.error('get_group_chat_history failed', e)
        return { group_id, error: e?.message || String(e) }
      }
    },
  },
]

const toolManager = ToolManager.getInstace()
oneBotToolArr.forEach(tool => toolManager.register(tool))
