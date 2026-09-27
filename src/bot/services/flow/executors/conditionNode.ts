import { createLogger } from '@/utils/logger'
import { executorFactory } from '../executorFactory'
import type { ConditionNodeData, NodeExecutor } from '../types'

// ============================================================================
// 条件节点执行器
// ----------------------------------------------------------------------------
// 将 expression 中的 {{路径}} 渲染为 JSON 字面量后，作为 JS 表达式求值，
// 布尔结果映射到 'true'/'false' 出口，供引擎按连线 sourceHandle 选路。
// 求值失败（表达式非法/引用缺失）按非关键路径降级为 false，并记录异常。
// ============================================================================

const logger = createLogger('FlowCondition')

const conditionNodeExecutor: NodeExecutor = {
  kind: 'condition',
  run: (ctx, node) => {
    const data = node.data as ConditionNodeData
    const rendered = ctx.renderExpr(data.expression)
    let result = false
    if (rendered.trim()) {
      try {
        // 表达式来自画布配置（管理员可信来源），渲染后为纯布尔/比较运算
        result = !!new Function(`return (${rendered})`)()
      } catch (e: any) {
        logger.error(`Condition eval failed (${data.label}): ${e?.message || e}`)
        result = false
      }
    }
    const branch = result ? 'true' : 'false'
    ctx.record(node, { result, branch })
    return { data: { result }, branch }
  },
}

executorFactory.registry(conditionNodeExecutor)
