import { BeanFactory } from '@/core/bean';
import { MessageItem, GroupMessageSend, OB11MessageImage, OB11MessageVideo, OB11MessageRecord } from "@/interface/onebot";
import { ActionResult } from '@/interface/actoin';
import { Session } from "@/core/session";
import { createLogger } from '@utils/logger'
import type { ResourceConfig } from '@/beans/resource';

/**
 * 消息工具集与链式构造器。
 *
 * 演进目标：
 *  1) 通过 MessageBuilder 链式拼装 ActionResult，避免调用方手工组装 items 数组；
 *  2) 资源解析支持多段路径参数（目录 -> 随机、文件 -> 精确），
 *     按扩展名动态选择 image / video / record 消息段类型。
 */
const factory = BeanFactory.getInstance()
const logger = createLogger('MessageUtils')

// ============================================================================
// 资源类型识别
// ============================================================================

/** 语音类扩展名：record 消息段 */
const VOICE_EXT_RE = /\.(mp3|wav|ogg|amr|silk)$/i
/** 视频类扩展名：video 消息段 */
const VIDEO_EXT_RE = /\.(mp4|mov|avi|webm|flv|m4v|mkv)$/i

type ResourceKind = 'image' | 'video' | 'record'

/** 依据文件扩展名推断消息段类型；未识别后缀按 image 兜底以适配绝大多数资源目录 */
function guessKind(file: string): ResourceKind {
  if (VOICE_EXT_RE.test(file)) return 'record'
  if (VIDEO_EXT_RE.test(file)) return 'video'
  return 'image'
}

/** 统一路径分隔符，屏蔽 Windows/Posix 差异，方便按段匹配 */
function normalize(p: string): string {
  return p.replace(/\\/g, '/')
}

/**
 * 资源路径解析：首段为资源 folder 名称（对应 resource bean），其后每一段
 * 依次视为目录名或文件名。
 *   - 末段是目录（或路径段）→ 在该目录下随机挑一个资源
 *   - 末段是文件（带扩展名）→ 精确命中该文件
 * 为兼容旧 `makeRandomResource(folder, name)` 语义，精确匹配失败时降级为子串匹配。
 */
function resolveResourcePath(segments: string[]): string | undefined {
  if (segments.length === 0) {
    logger.warn('resolveResourcePath: empty segments')
    return
  }
  const [folderName, ...rest] = segments
  const resource = factory.getBeanValue<ResourceConfig>('resource')
  const targetFolder = resource?.folder?.find(f => f.name === folderName)
  let candidates = ((targetFolder?.children || []) as string[]).filter(Boolean)
  if (candidates.length === 0) {
    logger.warn(`no resource under folder: ${folderName}`)
    return
  }
  for (const seg of rest) {
    if (!seg) continue
    const lowerSeg = seg.toLowerCase()
    // 优先按目录段/文件段精确匹配：/seg/ 表示中间目录；/seg 结尾表示文件名
    const dirHit = candidates.filter(p => normalize(p).toLowerCase().includes(`/${lowerSeg}/`))
    const fileHit = candidates.filter(p => normalize(p).toLowerCase().endsWith(`/${lowerSeg}`))
    const exact = Array.from(new Set([...dirHit, ...fileHit]))
    if (exact.length > 0) {
      candidates = exact
      continue
    }
    // 退化为子串包含（保留旧 name 过滤语义，例如 '231' 命中 '231xx.png'）
    const fuzzy = candidates.filter(p => normalize(p).toLowerCase().includes(lowerSeg))
    if (fuzzy.length === 0) {
      logger.warn(`no resource matched path segment: ${seg}`)
      return
    }
    candidates = fuzzy
  }
  const randIndex = Math.floor(Math.random() * candidates.length)
  return candidates[randIndex]
}

/**
 * 构造一段资源消息（image/video/record 由扩展名动态决定）。
 * 支持变长路径参数：
 *   `makeResource('cat')` — 在 cat folder 下随机
 *   `makeResource('cat', 'sub')` — 在 cat/sub 目录下随机
 *   `makeResource('cat', 'a.png')` — 精确使用 a.png
 * 未命中返回 undefined，调用方按业务决定是否忽略。
 */
export function makeResource(...segments: string[]): OB11MessageImage | OB11MessageVideo | OB11MessageRecord | undefined {
  const file = resolveResourcePath(segments)
  if (!file) return
  const kind = guessKind(file)
  return { type: kind, data: { file } } as any
}

/**
 * @deprecated 保留兼容旧调用点，语义已并入 makeResource 的多段路径参数；
 * 新代码请优先使用 makeResource / MessageBuilder.resource。
 */
export const makeRandomResource = makeResource

// ============================================================================
// 单条消息段构造：轻量纯函数，供 MessageBuilder 与散落调用点复用
// ============================================================================

export function makeVoiceMsg(url: string): MessageItem {
  const msg = {} as MessageItem
  msg.type = 'record'
  msg.data = {
    file: url,
  }
  return msg
}

export function makeVideoMsg(url: string): MessageItem {
  const msg = {} as MessageItem
  msg.type = 'video'

  msg.data = {
    file: url
  }
  return msg
}


export function makeTextMsg(text: string): MessageItem {
  const msg = {} as MessageItem
  msg.type = 'text'
  msg.data = {
    text,
  }
  return msg
}

export function makeReplyMsg(id: string): MessageItem {
  const msg = {} as MessageItem
  msg.type = 'reply'
  msg.data = {
    id
  }
  return msg
}

export function makeAtMsg(qq: string): MessageItem {
  const msg = {} as MessageItem
  msg.type = 'at'
  msg.data = {
    qq,
  }
  return msg
}

export function makeImageMsg(url: string): MessageItem {
  const msg = {} as MessageItem
  msg.type = 'image'
  msg.data = {
    file: url,
    url: url,
  }
  return msg
}

// ============================================================================
// MessageBuilder：链式构建 ActionResult
// ============================================================================

/**
 * 链式消息构造器。
 *
 * 用法：
 *   MessageBuilder.message()
 *     .at(userId)
 *     .text('\n看看这个')
 *     .resource('cat', 'subdir')
 *     .build()
 *
 * 构造入参为 ActionResult 的 type 字段（'message' | 'forward-message'），
 * 'forward-message' 模式下，`append` 系列的语义转为「向嵌套转发列表追加消息段」。
 */
export class MessageBuilder {
  /** 普通消息段集合（type=message 时使用） */
  private items: MessageItem[] = []
  /** 转发嵌套节点列表（type=forward-message 时使用） */
  private forwardNodes: MessageItem[] = []

  constructor(private readonly type: ActionResult['type']) {}

  /** 按 ActionResult 类型创建 builder；等价于 new MessageBuilder(type) */
  static of(type: ActionResult['type']): MessageBuilder {
    return new MessageBuilder(type)
  }
  static message(): MessageBuilder {
    return new MessageBuilder('message')
  }
  static forward(): MessageBuilder {
    return new MessageBuilder('forward-message')
  }

  /** 追加原始消息段；message 与 forward 共用同一入口，落到各自的存储 */
  append(item: MessageItem): this {
    if (this.type === 'forward-message') this.forwardNodes.push(item)
    else this.items.push(item)
    return this
  }

  /** 批量追加 */
  appendAll(items: MessageItem[]): this {
    for (const it of items) this.append(it)
    return this
  }

  text(t: string): this { return this.append(makeTextMsg(t)) }
  at(qq: string): this { return this.append(makeAtMsg(qq)) }
  reply(id: string): this { return this.append(makeReplyMsg(id)) }
  image(url: string): this { return this.append(makeImageMsg(url)) }
  video(url: string): this { return this.append(makeVideoMsg(url)) }
  record(url: string): this { return this.append(makeVoiceMsg(url)) }

  /**
   * 变长路径段解析资源并追加；未命中时静默跳过（不影响链式后续调用）。
   * @param segments 首段为 folder 名，其后为目录名或文件名
   */
  resource(...segments: string[]): this {
    const item = makeResource(...segments)
    return item ? this.append(item) : this
  }

  /** 判断当前 builder 是否尚未累积任何内容，供命令层提前返回 */
  isEmpty(): boolean {
    return this.type === 'forward-message'
      ? this.forwardNodes.length === 0
      : this.items.length === 0
  }

  /** 产出标准 ActionResult；forward 类型自动包装为 { data: { messages } } */
  build(): ActionResult {
    if (this.type === 'forward-message') {
      return { type: 'forward-message', data: { messages: this.forwardNodes } }
    }
    return { type: 'message', items: this.items }
  }
}

// ============================================================================
// 会话判定辅助
// ============================================================================

export function judgeIsAtMe(session: Session) {
  const me = factory.getBeanValue<string>('me')
  return session.message.some(m => m?.type === 'at' && m?.data?.qq === me)
}

/** 保留旧导出以避免跨模块潜在引用被拆散 */
export type { GroupMessageSend }
