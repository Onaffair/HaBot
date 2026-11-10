import type { MessageItem } from '@/interface/onebot'
import type { AgentTool, AgentToolContext } from '../type'
import { ToolManager } from '../type'
import { createLogger } from '@utils/logger'
import { resolveResourceFile } from '@/utils/resourcePath'

// ============================================================================
// AI 消息构建工具
// ----------------------------------------------------------------------------
// 对话循环（commands/aiChat）通过 AgentToolContext 注入本轮消息草稿：
//  - build_message：把 AI 给出的消息段翻译为 OneBot 消息段追加进草稿，可多次调用；
//  - finish_message：终结性工具（terminal），AI 调用即结束对话循环，
//    之后由对话循环把草稿统一构建为 ActionResult 发送。
// 资源段（image/video/record）复用 utils/resourcePath 的路径语义，与命令侧
// makeResource、画布消息节点保持一致：末段带扩展名为具体文件，否则视为目录
// 随机取该类媒体文件，相对路径以 RESOURCE_PATH 为基准。
// 工具输出会被序列化回灌进上下文，故只返回追加数量与失败原因，保持精简。
// ============================================================================

const logger = createLogger('MessageBuilderTool')

/** 可构建的消息段类型（字符串字面量联合，不使用 enum） */
type SegmentKind = 'text' | 'at' | 'reply' | 'image' | 'video' | 'record' | 'face' | 'poke'

/** AI 传入的单个消息段描述，字段按 type 取用 */
interface SegmentInput {
  type: SegmentKind
  /** type=text 时的文本内容 */
  text?: string
  /** type=at 时的目标 QQ；缺省艾特当前发言人，all 为全体 */
  qq?: string
  /** type=reply 时为被引用消息的 message_id；type=face 时为表情 id */
  id?: string
  /** type=image/video/record 时的资源：http(s) 链接或文件系统路径 */
  file?: string
}

/** 单个消息段翻译结果：成功给 item，失败给 error 原因 */
interface SegmentResult {
  item?: MessageItem
  error?: string
}

/** http(s) 资源直接交给 OneBot 拉取，不做本地路径解析 */
const URL_RE = /^https?:\/\//

/** 常见中英文标点（文本一个都不含时视为“通篇无标点”，触发兜底补全） */
const ANY_PUNCT_RE = /[，,。.、;；:！!？?~～…“”‘’《》〈〉【】（）()\-—·@＃#*_/\\]/

/**
 * 兜底补全标点：模型经工具传 text 时经常整句不加标点，在提示词之外做确定性修正。
 * 只在文本不含任何标点时介入：去掉充当断句的空格并在结尾补一个句号；
 * 已带标点的文本（如人格要求的“哈~！！”开头）与含链接的文本原样放行，不做改写。
 */
function normalizePunctuation(text: string): string {
  if (URL_RE.test(text) || /https?:\/\/\S/.test(text)) return text
  if (ANY_PUNCT_RE.test(text)) return text
  const cleaned = text.replace(/\s+/g, '')
  return cleaned ? `${cleaned}。` : text
}

/**
 * 把单个 AI 描述翻译为 OneBot 消息段。
 * 失败不抛出，返回原因由工具汇总回灌给模型，便于其修正后重试。
 */
function toMessageItem(seg: SegmentInput, ctx: AgentToolContext): SegmentResult {
  switch (seg.type) {
    case 'text': {
      const text = normalizePunctuation((seg.text ?? '').trim())
      return text ? { item: { type: 'text', data: { text } } } : { error: 'text 段缺少 text 内容' }
    }
    case 'at': {
      // at 仅群聊有效；目标缺省为当前发言人
      if (!ctx.session.isGroup) return { error: '私聊会话不能发送 at 段' }
      const qq = seg.qq?.trim() || ctx.session.userId || ''
      return qq ? { item: { type: 'at', data: { qq } } } : { error: 'at 段缺少目标 qq' }
    }
    case 'reply': {
      const id = seg.id?.trim() || String(ctx.session.raw?.message_id ?? '')
      return id ? { item: { type: 'reply', data: { id } } } : { error: 'reply 段缺少消息 id' }
    }
    case 'face': {
      const id = seg.id?.trim() || ''
      return id ? { item: { type: 'face', data: { id } } } : { error: 'face 段缺少表情 id' }
    }
    case 'poke':
      return { item: { type: 'poke', data: { type: '0', id: '0' } } }
    case 'image':
    case 'video':
    case 'record': {
      const raw = seg.file?.trim() || ''
      if (!raw) return { error: `${seg.type} 段缺少资源路径` }
      if (URL_RE.test(raw)) {
        return { item: { type: seg.type, data: { file: raw, url: raw } } as MessageItem }
      }
      // 与命令侧 makeResource 一致：按段类型限定扩展名，目录随机、文件精确
      const file = resolveResourceFile([raw], seg.type)
      return file
        ? { item: { type: seg.type, data: { file } } as MessageItem }
        : { error: `${seg.type} 资源未找到: ${raw}` }
    }
    default:
      return { error: `不支持的消息段类型: ${String((seg as SegmentInput).type)}` }
  }
}

const messageBuilderTools: AgentTool[] = [
  {
    name: 'build_message',
    description: '构建要发送的消息：向本轮回复追加一个或多个消息段，可多次调用累积。支持 text 文本、at 艾特、reply 引用回复、image 图片、video 视频、record 语音、face QQ表情、poke 戳一戳。text 段内容必须使用正常标点符号：句子结尾用句号/感叹号/问号，句内断句用逗号，禁止无标点的连串文本。图片/视频/语音可直接传 http(s) 链接，或传本地资源路径（相对 RESOURCE_PATH 的目录/文件，末段为目录时随机取该类文件）。构建完成后必须调用 finish_message 结束并发送。',
    parameters: {
      type: 'object',
      properties: {
        segments: {
          type: 'array',
          description: '按顺序追加的消息段列表',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['text', 'at', 'reply', 'image', 'video', 'record', 'face', 'poke'],
                description: '消息段类型',
              },
              text: { type: 'string', description: 'type=text 时的文本内容；必须是带标点的正常句子（句尾用句号/感叹号/问号，句内用逗号断句），不要输出无标点的文本' },
              qq: { type: 'string', description: 'type=at 时的目标 QQ；填 all 艾特全体；缺省艾特当前发言人' },
              id: { type: 'string', description: 'type=reply 时为被引用消息的 message_id（缺省引用当前消息）；type=face 时为表情 id' },
              file: { type: 'string', description: 'type=image/video/record 时的资源：http(s) 链接或文件系统路径' },
            },
            required: ['type'],
          },
        },
      },
      required: ['segments'],
    },
    execute: (args: { segments?: SegmentInput[] } = {}, ctx?: AgentToolContext) => {
      if (!ctx) return { error: '缺少执行上下文，当前环境不可构建消息' }
      const segments = Array.isArray(args?.segments) ? args.segments : []
      if (segments.length === 0) return { error: 'segments 不能为空' }

      const errors: string[] = []
      const items: MessageItem[] = []
      for (const seg of segments) {
        if (!seg || typeof seg !== 'object') {
          errors.push('消息段必须是对象')
          continue
        }
        const { item, error } = toMessageItem(seg, ctx)
        if (item) items.push(item)
        else if (error) errors.push(error)
      }
      ctx.draft.push(...items)
      logger.info(`build_message appended ${items.length} segment(s), draft=${ctx.draft.length}`)
      return {
        appended: items.length,
        total: ctx.draft.length,
        ...(errors.length ? { errors } : {}),
      }
    },
  },
  {
    name: 'finish_message',
    description: '结束本轮对话并发送已构建的消息（循环退出工具）。全部消息段构建完成后必须调用，调用后不会再生成新内容；若只想回复一条纯文本，可直接用 text 参数发送（text 同样必须带正常标点符号）。',
    terminal: true,
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '可选：追加到消息末尾的纯文本，需使用正常标点符号（句尾句号/感叹号/问号，句内逗号断句）' },
      },
    },
    execute: (args: { text?: string } = {}, ctx?: AgentToolContext) => {
      if (!ctx) return { error: '缺少执行上下文，当前环境不可构建消息' }
      const text = normalizePunctuation((args?.text ?? '').trim())
      if (text) ctx.draft.push({ type: 'text', data: { text } })
      logger.info(`finish_message called, draft=${ctx.draft.length} segment(s)`)
      return { finished: true, total: ctx.draft.length }
    },
  },
]

const toolManager = ToolManager.getInstace()
messageBuilderTools.forEach((tool) => toolManager.register(tool))
