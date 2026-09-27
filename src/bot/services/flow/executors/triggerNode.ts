import { executorFactory } from '../executorFactory'
import type { NodeExecutor } from '../types'

// ============================================================================
// 触发节点执行器
// ----------------------------------------------------------------------------
// 触发命中判断已在引擎层（RuleEngine.matchTrigger）完成，进入流转后本节点仅作为
// 数据起点：把入口消息的可读信息记录进上下文，供下游节点引用（如 {{触发器.text}}）。
// ============================================================================

const triggerNodeExecutor: NodeExecutor = {
  kind: 'trigger',
  run: (ctx, node) => {
    const text = ctx.session.textContent
    const atMe = ctx.session.message?.some((m) => m?.type === 'at')
    ctx.record(node, { text, atMe, matched: true })
    return { data: { text, atMe, matched: true } }
  },
}

executorFactory.registry(triggerNodeExecutor)
