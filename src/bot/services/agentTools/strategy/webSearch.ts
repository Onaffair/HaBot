import axios from 'axios'
import { AgentTool, ToolManager } from '../type'
import { configService } from '@/services/db/systemConfig'
import { createLogger } from '@utils/logger'
import { buildAIProxyConfig } from '@ai/proxy'

// ============================================================================
// 联网搜索工具（DeepSeek Search API）
// ----------------------------------------------------------------------------
// 接口：POST https://api.deepseek.com/v1/tools/search
// 鉴权：Authorization: Bearer <DEEPSEEK_API_KEY>（与 DeepSeek 对话平台共用密钥）
// 端点与密钥统一走 configService，管理后台改动即刻生效；请求复用全局 AI 代理。
// 工具输出会被序列化回灌进上下文，因此只保留 AI 判断所需字段：
// 标题/链接/站点/日期/短摘要/长摘要，正文按需返回并截断，分数与图标等一律丢弃。
// 失败降级为带 error 的对象而非抛出，保证对话循环不中断。
// ============================================================================

const logger = createLogger('WebSearchTool')

/** 默认与最大返回条数：API 上限 50，这里收紧以控制回灌上下文的体量 */
const DEFAULT_COUNT = 5
const MAX_COUNT = 10
/** 摘要与正文的截断长度，防止单条结果过长挤占上下文 */
const MAX_SUMMARY_LENGTH = 500
const MAX_CONTENT_LENGTH = 1500
/** 搜索请求超时（毫秒） */
const REQUEST_TIMEOUT = 30000

/** DeepSeek Search API 单条结果（仅声明本项目用到的字段） */
interface SearchResult {
  title?: string
  url?: string
  snippet?: string
  summary?: string
  content?: string
  site_name?: string | null
  date?: string | null
}

/** DeepSeek Search API 响应：成功给 results，失败给 OpenAI 兼容的 error 结构 */
interface SearchResponse {
  results?: SearchResult[]
  error?: { message?: string; type?: string; code?: string }
}

/** 截断超长文本，保留省略标记 */
function clamp(text: string | null | undefined, max: number): string {
  const value = (text ?? '').trim()
  return value.length > max ? `${value.slice(0, max)}…` : value
}

/** 发布时间统一为 YYYY-MM-DD，未知或非法值返回空串 */
function toDate(value?: string | null): string {
  if (!value) return ''
  const time = Date.parse(value)
  return Number.isNaN(time) ? '' : new Date(time).toISOString().slice(0, 10)
}

/** 把 API 结果整形为 AI 判断所需的精简字段 */
function toBrief(result: SearchResult) {
  return {
    title: result.title ?? '',
    url: result.url ?? '',
    site: result.site_name ?? '',
    date: toDate(result.date),
    snippet: clamp(result.snippet, MAX_SUMMARY_LENGTH),
    summary: clamp(result.summary, MAX_SUMMARY_LENGTH),
    // need_content 为 false 时 API 返回空串，不输出该字段
    ...(result.content ? { content: clamp(result.content, MAX_CONTENT_LENGTH) } : {}),
  }
}

class WebSearch implements AgentTool {
  name = 'webSearch'
  description = '联网搜索网页，返回标题、链接、站点、发布时间与摘要；query 支持 site:、-site:、lang:、after:、before: 等搜索语法，需要网页正文时把 need_content 设为 true'
  parameters = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: '搜索词，1～128 个字符，支持 site:github.com、lang:zh、after:2025 等语法',
      },
      count: {
        type: 'number' as const,
        description: `返回条数，默认 ${DEFAULT_COUNT}，最多 ${MAX_COUNT}`,
      },
      need_content: {
        type: 'boolean' as const,
        description: '是否返回网页正文（content 字段），默认 false；正文过长会被截断',
      },
    },
    required: ['query'],
  }

  async execute(args: { query: string; count?: number; need_content?: boolean }) {
    const query = (args?.query ?? '').trim()
    if (!query) return { query, results: [], error: 'query 不能为空' }
    // API 约束 1～128 个字符，提前拦截避免无效请求
    if (query.length > 128) return { query, results: [], error: 'query 不能超过 128 个字符' }

    const secret = configService.get('DEEPSEEK_API_KEY', '')
    if (!secret) return { query, results: [], error: '未配置 DEEPSEEK_API_KEY' }

    const count = Math.min(Math.max(Math.trunc(Number(args?.count)) || DEFAULT_COUNT, 1), MAX_COUNT)

    try {
      const { data } = await axios.post<SearchResponse>(
        configService.get('DEEPSEEK_SEARCH_BASE_URL', 'https://api.deepseek.com/v1/tools/search'),
        {
          query,
          count,
          need_content: !!args?.need_content,
        },
        {
          headers: {
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
          // 与 AI 平台共用全局代理，未配置时为空对象（直连）
          ...buildAIProxyConfig(),
        },
      )

      const results = (data?.results ?? []).slice(0, count).map(toBrief)
      logger.info(`search "${query}" -> ${results.length} result(s)`)
      return { query, count: results.length, results, source: 'deepseek-search' }
    } catch (e: any) {
      // 错误响应为 OpenAI 兼容结构，优先取其中的 message
      const message = e?.response?.data?.error?.message || e?.message || String(e)
      logger.error(`search "${query}" failed: ${message}`)
      return { query, results: [], error: message }
    }
  }
}

const toolManager = ToolManager.getInstace()
toolManager.register(new WebSearch())
