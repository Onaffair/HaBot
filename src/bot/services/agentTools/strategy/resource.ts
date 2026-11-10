import fs from 'fs'
import path from 'path'
import { AgentTool, ToolManager } from '../type'
import { createLogger } from '@utils/logger'
import { MEDIA_EXT_BY_TYPE, resourceBaseDir, scanMedia, toResourceAbsPath } from '@/utils/resourcePath'
import type { ResourceKind } from '@/utils/resourcePath'

// ============================================================================
// 多模态资源读取工具
// ----------------------------------------------------------------------------
// 只有 build_message 时 AI 并不知道 RESOURCE_PATH 下有什么资源，发图/发语音只能靠猜。
// 本模块补两个只读工具：
//   - list_resources：列出某个子目录下的子目录与图片/视频/音频文件（相对资源根目录
//     的路径、媒体类型、大小），可按类型与文件名关键词过滤；
//   - get_resource_info：查看单个文件或整个目录的详情（目录给出各类媒体数量与示例）。
// 返回的路径与 build_message 的 file 参数同源（相对 RESOURCE_PATH，目录随机取、
// 文件精确命中），AI 拿到后直接交给 build_message，无需再做路径换算。
// 两个工具都只读、且限定在资源根目录内（越界路径直接拒绝）；失败降级为带 error
// 的对象而非抛出，保证对话循环不中断。
// ============================================================================

const logger = createLogger('ResourceTool')

/** 单次列出的文件条数默认/上限：控制回灌上下文的体量 */
const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100
/** 子目录一次最多返回的条数 */
const MAX_DIR_LIST = 30
/** 目录详情里每类媒体给出的示例文件名条数 */
const SAMPLE_PER_KIND = 3

/** 全部媒体类型（取自路径模块的扩展名白名单，顺序固定便于稳定输出） */
const RESOURCE_KINDS = Object.keys(MEDIA_EXT_BY_TYPE) as ResourceKind[]

/** 归一化 AI 传入的路径：去空白、反斜杠转正斜杠 */
function normalize(p?: string): string {
  return (p ?? '').trim().replace(/\\/g, '/')
}

/** 绝对路径转「相对资源根目录」的展示路径，统一用正斜杠 */
function toRelPath(abs: string): string {
  return path.relative(resourceBaseDir(), abs).split(path.sep).join('/')
}

/** 路径是否落在资源根目录之内（根目录本身算在内），用于拦截 ../ 越界与绝对路径外泄 */
function inResourceBase(abs: string): boolean {
  const rel = path.relative(resourceBaseDir(), abs)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** 按扩展名判定媒体类型；非媒体文件返回 undefined（与 guessResourceKind 的兜底语义不同） */
function mediaKindOf(file: string): ResourceKind | undefined {
  const ext = path.extname(file).toLowerCase()
  return RESOURCE_KINDS.find((kind) => MEDIA_EXT_BY_TYPE[kind].includes(ext))
}

/** 文件大小转可读文本，避免把字节数灌进上下文 */
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes}B`
}

/** 修改时间转本地可读时间：YYYY-MM-DD HH:mm */
function formatTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const resourceTools: AgentTool[] = [
  {
    name: 'list_resources',
    description: '列出资源目录下某个子目录中的图片、视频、音频文件与子目录，返回可直接传给 build_message 的相对路径、媒体类型与文件大小（把目录路径传给 build_message 会随机取该类文件）。支持按媒体类型和文件名关键词过滤。',
    parameters: {
      type: 'object',
      properties: {
        dir: {
          type: 'string' as const,
          description: '相对资源根目录的子目录，如 cat、原神、voice_haqi；留空表示根目录',
        },
        type: {
          type: 'string' as const,
          enum: ['all', 'image', 'video', 'record'],
          description: '只看某一类媒体：image 图片、video 视频、record 音频；默认 all',
        },
        keyword: {
          type: 'string' as const,
          description: '可选：按文件名/相对路径过滤，仅返回包含该关键词的文件',
        },
        limit: {
          type: 'number' as const,
          description: `最多返回的文件条数，默认 ${DEFAULT_LIMIT}，最多 ${MAX_LIMIT}`,
        },
      },
    },
    execute: ({ dir, type, keyword, limit }: { dir?: string; type?: ResourceKind | 'all'; keyword?: string; limit?: number }) => {
      const rel = normalize(dir)
      const abs = toResourceAbsPath(rel ? [rel] : [])
      if (!inResourceBase(abs)) return { dir: rel, error: '只能查看资源目录内的路径' }

      let stat: fs.Stats
      try {
        stat = fs.statSync(abs)
      } catch {
        return { dir: rel || '.', error: `目录不存在：${rel || '.'}` }
      }
      if (!stat.isDirectory()) return { dir: rel, error: `不是目录：${rel}` }

      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(abs, { withFileTypes: true })
      } catch (e: any) {
        logger.error('list_resources readdir failed', e?.message || e)
        return { dir: rel || '.', error: e?.message || String(e) }
      }

      const kindFilter = type && type !== 'all' ? type : undefined
      const needle = normalize(keyword).toLowerCase()
      const max = Math.min(Math.max(Math.trunc(Number(limit)) || DEFAULT_LIMIT, 1), MAX_LIMIT)

      entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      const subdirs: string[] = []
      const files: { path: string, type: ResourceKind, size: string }[] = []
      let matched = 0
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (subdirs.length < MAX_DIR_LIST) subdirs.push(toRelPath(path.join(abs, entry.name)))
          continue
        }
        const kind = mediaKindOf(entry.name)
        if (!kind) continue
        if (kindFilter && kind !== kindFilter) continue
        const filePath = toRelPath(path.join(abs, entry.name))
        if (needle && !filePath.toLowerCase().includes(needle)) continue
        matched++
        if (files.length >= max) continue
        let size = ''
        try {
          size = formatSize(fs.statSync(path.join(abs, entry.name)).size)
        } catch {
          // 列举过程中文件被删：大小留空，路径本身仍可用
        }
        files.push({ path: filePath, type: kind, size })
      }

      logger.info(`list_resources ${rel || '.'} -> ${files.length}/${matched} file(s)`)
      return {
        dir: rel || '.',
        ...(kindFilter ? { type: kindFilter } : {}),
        ...(needle ? { keyword: needle } : {}),
        subdirs,
        files,
        matched,
        truncated: matched > files.length,
      }
    },
  },
  {
    name: 'get_resource_info',
    description: '查看资源目录下某个文件或子目录的详情：文件返回媒体类型、大小与修改时间；目录返回各类媒体文件数量与若干示例文件名，用来确认目录里到底有什么。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string' as const,
          description: '相对资源根目录的文件或子目录路径，如 cat/1239g-zgp2p.jpg、voice_haqi',
        },
      },
      required: ['path'],
    },
    execute: ({ path: p }: { path: string }) => {
      const input = normalize(p)
      if (!input) return { path: input, error: 'path 不能为空' }
      const abs = toResourceAbsPath([input])
      if (!inResourceBase(abs)) return { path: input, error: '只能查看资源目录内的路径' }

      let stat: fs.Stats
      try {
        stat = fs.statSync(abs)
      } catch {
        return { path: input, found: false, message: '路径不存在' }
      }

      if (stat.isFile()) {
        const kind = mediaKindOf(abs)
        return {
          path: input,
          found: true,
          kind: 'file',
          type: kind ?? 'unknown',
          ext: path.extname(abs).toLowerCase(),
          size: formatSize(stat.size),
          modified: formatTime(stat.mtimeMs),
          ...(kind ? {} : { message: '不是可发送的媒体文件（仅支持图片/视频/音频）' }),
        }
      }

      const counts = {} as Record<ResourceKind, number>
      const samples: string[] = []
      for (const kind of RESOURCE_KINDS) {
        const hits = scanMedia(abs, MEDIA_EXT_BY_TYPE[kind])
        counts[kind] = hits.length
        samples.push(...hits.slice(0, SAMPLE_PER_KIND).map(toRelPath))
      }
      const total = RESOURCE_KINDS.reduce((sum, kind) => sum + counts[kind], 0)
      return {
        path: input,
        found: true,
        kind: 'dir',
        total,
        counts,
        samples,
        ...(total === 0 ? { message: '该目录下没有可发送的图片/视频/音频文件' } : {}),
      }
    },
  },
]

const toolManager = ToolManager.getInstace()
resourceTools.forEach((tool) => toolManager.register(tool))
