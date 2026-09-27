import { createLogger } from '@/utils/logger'
import { executorFactory } from '../executorFactory'
import type { NodeExecutor } from '../types'

// ============================================================================
// 输出节点执行器
// ----------------------------------------------------------------------------
// 流程终点：到达即抽干上下文 outbox（由消息构建节点累积）并通过会话发送。
// outbox 为空时不发送（例如上游条件走了另一分支）。发送异常记入日志并标注该
// 节点轨迹失败，交由引擎继续处理其余分支，不使整体流转崩溃。
// ============================================================================

const logger = createLogger('FlowOutput')

const outputNodeExecutor: NodeExecutor = {
  kind: 'output',
  run: async (ctx, node) => {
    const items = ctx.drainOutbox()
    if (items.length === 0) {
      logger.info(`Output node skipped (empty outbox): ${node.data?.label ?? node.id}`)
      return
    }
    try {
      await ctx.session.sendItems(items)
      ctx.sent += 1
      logger.info(`Output node sent ${items.length} segment(s): ${node.data?.label ?? node.id}`)
    } catch (e: any) {
      logger.error(`Output send failed (${node.data?.label ?? node.id}): ${e?.message || e}`)
      throw e
    }
  },
}

executorFactory.registry(outputNodeExecutor)
