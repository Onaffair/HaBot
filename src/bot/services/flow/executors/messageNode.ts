import type { Session } from '@/core/session'
import { groupMemberService } from '@/utils/groupMembers'
import { createLogger } from '@utils/logger'
import { resolveResourceFile } from '@/utils/resourcePath'
import type { MessageItem } from '@/interface/onebot'
import { executorFactory } from '../executorFactory'
import type { MessageNodeData, MessageSegment } from '../types'

// ============================================================================
// 消息构建节点执行器
// ----------------------------------------------------------------------------
// 按 segments 顺序把画布配置翻译成 OneBot 消息段推入上下文 outbox，交由后续
// output 节点统一发送。文本段支持 {{路径}} 引用上游数据；媒体段（图片/视频/语音）
// 的 file 为文件系统路径（绝对路径或相对 RESOURCE_PATH），末段带扩展名视为具体文件、
// 否则视为目录随机选取，解析规则与命令侧的 makeResource 共用 utils/resourcePath。
// at 段的 qq 按逗号拆成多个目标，逐个经模板渲染（'{{sender}}' 即触发者 QQ），
// 一个目标翻译成一个 at 段；name 按位对应，数量不一致时不传昵称（由客户端显示成员名）。
// at 目标还按当前会话的群过滤（见 filterAtTargets）：私聊不发 @，不在本群的成员丢弃。
// 资源解析失败属非关键路径：跳过该段并交由 resourcePath 写告警，不影响其余消息段。
// ============================================================================

const logger = createLogger('FlowMessageNode')

/** 代指触发者的模板 token（与前端 segmentEditor 写入的值一致） */
const SENDER_TOKEN = '{{sender}}'

/** 按逗号拆分并去掉空项（模板未解析出值时会产生空项） */
function splitTokens(raw?: string): string[] {
  return (raw || '').split(',').map((t) => t.trim()).filter(Boolean)
}

/** at 段的单个目标：raw 为画布配置原文（可能含模板），qq 为渲染后的目标号 */
interface AtTarget {
  raw: string
  qq: string
  /** 按位配好的展示昵称，无则交给客户端显示群名片/昵称 */
  name?: string
}

/** @ 过滤所需的会话群范围 */
interface AtScope {
  /** 当前群号，私聊为空串 */
  groupId: string
  /** 当前群成员 QQ；null 表示无从判断，不做成员过滤 */
  members: Set<string> | null
}

/**
 * 解析当前会话的 @ 范围。
 * 成员集复用挑选候选时同一份数据（group bean 缓存优先，未命中时经 OneBot 拉取并回写），
 * 拉到空列表当作「无从判断」，避免缓存/网络问题把整段 @ 全部吃掉。
 */
async function resolveAtScope(session: Session): Promise<AtScope> {
  const groupId = String(session.groupId ?? '')
  if (!groupId) return { groupId: '', members: null }
  const members = await groupMemberService.listMembers(groupId)
  return { groupId, members: members.length ? new Set(members.map((m) => m.userId)) : null }
}

/**
 * 按当前群过滤 @ 目标：
 *  - 群号为空（私聊）→ 整段 at 丢弃；
 *  - 目标不在本群成员里 → 丢弃该目标；
 *  - '{{sender}}'（触发者必然在本群）与历史值 'all' 不参与成员校验，
 *    避免成员缓存没跟上（如刚入群）时误杀。
 */
function filterAtTargets(targets: AtTarget[], scope: AtScope): AtTarget[] {
  if (!scope.groupId) return []
  if (!scope.members) return targets
  return targets.filter(({ raw, qq }) => qq === 'all' || raw.includes(SENDER_TOKEN) || scope.members!.has(qq))
}

/** 把单条消息段翻译为 OneBot 消息段（at 段多目标时展开为多段）；无法解析时返回空数组 */
async function buildSegmentItems(
  seg: MessageSegment,
  ctx: { renderText: (t?: string) => string },
  scope: AtScope | null,
  stat: { atDropped: number },
): Promise<MessageItem[]> {
  switch (seg.type) {
    case 'text': {
      const text = ctx.renderText(seg.text)
      return text ? [{ type: 'text', data: { text } } as MessageItem] : []
    }
    case 'at': {
      if (!scope) return []
      const rawNames = (seg.name || '').split(',')
      const rawTokens = splitTokens(seg.qq)
      // 昵称与目标数量一致才按位取用；逐 token 渲染才能与各自昵称配对（过滤后位序会变）
      const zipName = rawNames.length === rawTokens.length
      const targets: AtTarget[] = rawTokens
        .map((raw, i) => ({ raw, qq: ctx.renderText(raw), name: zipName ? rawNames[i].trim() : undefined }))
        .filter((t) => t.qq)
      const kept = filterAtTargets(targets, scope)
      stat.atDropped += targets.length - kept.length
      if (kept.length !== targets.length) {
        const dropped = targets.filter((t) => !kept.includes(t)).map((t) => t.qq)
        logger.warn(`@ 目标已按当前群${scope.groupId || '（私聊）'}过滤：${dropped.join('、')}`)
      }
      return kept.map(({ qq, name }) => ({
        type: 'at',
        data: name ? { qq, name } : { qq },
      } as MessageItem))
    }
    case 'face':
      return seg.faceId ? [{ type: 'face', data: { id: seg.faceId } } as MessageItem] : []
    case 'poke':
      return [{ type: 'poke', data: { type: seg.pokeType || '0', id: seg.pokeType || '0' } } as MessageItem]
    case 'image':
    case 'video':
    case 'record': {
      const raw = (seg.file || '').trim()
      if (!raw) return []
      // 按段类型限定扩展名白名单，目录则递归随机挑一个该类媒体文件
      const file = resolveResourceFile([raw], seg.type)
      return file ? [{ type: seg.type, data: { file } } as MessageItem] : []
    }
    default:
      return []
  }
}

const messageNodeExecutor = {
  kind: 'message' as const,
  run: async (ctx, node) => {
    const data = node.data as MessageNodeData
    const segments = Array.isArray(data.segments) ? data.segments : []
    // 只有真的存在 at 段时才解析当前群成员（可能触发一次 OneBot 拉取）
    let scope: AtScope | null = null
    if (segments.some((s) => s.type === 'at')) scope = await resolveAtScope(ctx.session)
    const stat = { atDropped: 0 }
    const items: MessageItem[] = []
    for (const seg of segments) items.push(...(await buildSegmentItems(seg, ctx, scope, stat)))
    if (items.length > 0) ctx.pushOutbox(items)
    // atDropped 一并向下游传递，方便画布用 {{消息构建.atDropped}} 判断是否被群过滤掉
    ctx.record(node, { count: items.length, atDropped: stat.atDropped })
    return { data: { count: items.length, atDropped: stat.atDropped } }
  },
}

executorFactory.registry(messageNodeExecutor)
