// ============================================================================
// 规则引擎模块入口
// ----------------------------------------------------------------------------
// 职责：先以 import 副作用触发各节点执行器自注册（新增执行器在此追加一行即可），
// 再统一对外导出引擎、执行器工厂、执行上下文与类型。
// ============================================================================

// 执行器自注册（顺序无关，仅触发各文件末尾的 executorFactory.registry 调用）
import './executors/triggerNode'
import './executors/aiNode'
import './executors/conditionNode'
import './executors/messageNode'
import './executors/outputNode'

export { RuleEngine, ruleEngine } from './engine'
export { ExecutorFactory, executorFactory } from './executorFactory'
export { ExecutionContext } from './context'
export * from './types'
