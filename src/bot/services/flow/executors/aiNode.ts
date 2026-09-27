import { AIRequestManager } from '@ai'
import type { BaseMessage } from '@ai'
import { createLogger } from '@/utils/logger'
import { extractMessageContent } from '@utils/messageContent'
import { executorFactory } from '../executorFactory'
import type { AiNodeData, NodeExecutor } from '../types'

// ============================================================================
// AI 处理节点执行器
// ----------------------------------------------------------------------------
// 以系统提示词（可含 {{路径}} 引用上游数据）+ 当前会话消息为输入，向 openai 平台
// 发起一轮生成，将模型回复作为 output 记录进上下文，供下游条件/消息节点引用。
// 生成失败按非关键路径降级：记录空串并继续流转，不中断整个画布。
// ============================================================================

const logger = createLogger('FlowAI')
const aiManager = AIRequestManager.getInstance()

/** 默认模型：节点未配置 model 时兜底 */
const DEFAULT_MODEL = 'gpt-4o'

const aiNodeExecutor: NodeExecutor = {
  kind: 'ai',
  run: async (ctx, node) => {
    const data = node.data as AiNodeData
    const messages: BaseMessage[] = []

    const systemPrompt = ctx.renderText(data.systemPrompt)
    if (systemPrompt) {
      messages.push({ role: 'system', content: [{ type: 'text', text: systemPrompt }] })
    }
    // 用户侧内容取当前会话消息（含图片/语音等富媒体，交由平台适配器过滤支持项）
    const userContent = extractMessageContent(ctx.session.message || [])
    if (userContent.length > 0) {
      messages.push({ role: 'user', content: userContent })
    }

    const options = {
      model: data.model || DEFAULT_MODEL,
      temperature: data.temperature,
      max_tokens: data.maxTokens,
    }

    const reply = await aiManager
      .sendMessage('openai', messages, options)
      .catch((e: any) => {
        logger.error(`AI node failed (${data.label}): ${e?.message || e}`)
        return ''
      })

    // 工具调用等非字符串结果统一转文本承载，保证下游 {{路径}} 可读
    const output = typeof reply === 'string' ? reply : JSON.stringify(reply ?? '')
    ctx.record(node, { output })
    return { data: { output } }
  },
}

executorFactory.registry(aiNodeExecutor)
