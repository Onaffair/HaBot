import fs from 'fs'
import path from 'path'
import { createLogger } from '@/utils/logger'
import type { MessageItem } from '@/interface/onebot'
import { executorFactory } from '../executorFactory'
import type { MessageNodeData, MessageSegment } from '../types'

// ============================================================================
// 消息构建节点执行器
// ----------------------------------------------------------------------------
// 按 segments 顺序把画布配置翻译成 OneBot 消息段推入上下文 outbox，交由后续
// output 节点统一发送。文本段支持 {{路径}} 引用上游数据；媒体段（图片/视频/语音）
// 的 file 既可为具体文件（末段带扩展名），也可为目录（发送时随机挑一个媒体文件）。
// 资源解析失败属非关键路径：跳过该段并告警，不影响其余消息段。
// ============================================================================

const logger = createLogger('FlowMessage')

/** 目录随机选取时各类媒体允许的扩展名（含点，小写） */
const MEDIA_EXT_BY_TYPE: Partial<Record<MessageSegment['type'], string[]>> = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v'],
  record: ['.mp3', '.wav', '.ogg', '.amr', '.m4a', '.flac', '.silk'],
}

/** 递归扫描目录的最大深度，防御畸形/过深目录 */
const MAX_SCAN_DEPTH = 5

/** 判断路径末段是否为带扩展名的具体文件 */
function looksLikeFile(p: string): boolean {
  return /\.[\w]+$/.test(path.basename(p))
}

/** 递归收集目录下命中扩展名的文件绝对路径（限制深度，读目录失败静默跳过） */
function scanMedia(dir: string, exts: string[], depth = 0): string[] {
  if (depth > MAX_SCAN_DEPTH) return []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const result: string[] = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) result.push(...scanMedia(full, exts, depth + 1))
    else if (e.isFile() && exts.some((ext) => e.name.toLowerCase().endsWith(ext))) result.push(full)
  }
  return result
}

/**
 * 解析媒体段的资源路径为可发送的文件绝对路径。
 * 具体文件直接返回；目录则递归随机取一个命中该类型扩展名的文件。
 */
function resolveSegmentFile(seg: MessageSegment): string | undefined {
  const raw = (seg.file || '').trim()
  if (!raw) return undefined
  if (looksLikeFile(raw)) return raw
  if (!fs.existsSync(raw)) {
    logger.warn(`Media directory not found: ${raw}`)
    return undefined
  }
  const candidates = scanMedia(raw, MEDIA_EXT_BY_TYPE[seg.type] || [])
  if (candidates.length === 0) {
    logger.warn(`No media file under directory: ${raw}`)
    return undefined
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/** 把单条消息段翻译为 OneBot 消息段；无法解析时返回 undefined */
function buildSegmentItem(seg: MessageSegment, ctx: { renderText: (t?: string) => string }): MessageItem | undefined {
  switch (seg.type) {
    case 'text': {
      const text = ctx.renderText(seg.text)
      return text ? ({ type: 'text', data: { text } } as MessageItem) : undefined
    }
    case 'at':
      return seg.qq ? ({ type: 'at', data: { qq: seg.qq, name: seg.name } } as MessageItem) : undefined
    case 'face':
      return seg.faceId ? ({ type: 'face', data: { id: seg.faceId } } as MessageItem) : undefined
    case 'poke':
      return { type: 'poke', data: { type: seg.pokeType || '0', id: seg.pokeType || '0' } } as MessageItem
    case 'image':
    case 'video':
    case 'record': {
      const file = resolveSegmentFile(seg)
      return file ? ({ type: seg.type, data: { file } } as MessageItem) : undefined
    }
    default:
      return undefined
  }
}

const messageNodeExecutor = {
  kind: 'message' as const,
  run: (ctx, node) => {
    const data = node.data as MessageNodeData
    const segments = Array.isArray(data.segments) ? data.segments : []
    const items: MessageItem[] = []
    for (const seg of segments) {
      const item = buildSegmentItem(seg, ctx)
      if (item) items.push(item)
    }
    if (items.length > 0) ctx.pushOutbox(items)
    ctx.record(node, { count: items.length })
    return { data: { count: items.length } }
  },
}

executorFactory.registry(messageNodeExecutor)
