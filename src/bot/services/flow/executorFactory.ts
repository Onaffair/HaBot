import { createLogger } from '@/utils/logger'
import type { NodeExecutor, NodeKind } from './types'

// ============================================================================
// 节点执行器工厂（单例）
// ----------------------------------------------------------------------------
// 以节点类别为键维护执行器注册表，一类节点一个执行器文件，文件末尾自注册；
// 引擎流转时按 node.type 取对应执行器执行。新增节点类别只需放入 executors 目录
// 并自注册，无需改动引擎。
// ============================================================================

const logger = createLogger('FlowExecutor')

export class ExecutorFactory {
  private static instance: ExecutorFactory
  private executors = new Map<NodeKind, NodeExecutor>()

  private constructor() {}

  static getInstance(): ExecutorFactory {
    if (!ExecutorFactory.instance) {
      ExecutorFactory.instance = new ExecutorFactory()
    }
    return ExecutorFactory.instance
  }

  /** 注册（同 kind 覆盖，保证热重载/重复导入幂等） */
  registry(executor: NodeExecutor): void {
    this.executors.set(executor.kind, executor)
    logger.info(`executor registered for node kind: ${executor.kind}`)
  }

  /** 取执行器，未注册返回 undefined */
  get(kind: NodeKind): NodeExecutor | undefined {
    return this.executors.get(kind)
  }

  has(kind: NodeKind): boolean {
    return this.executors.has(kind)
  }

  list(): NodeKind[] {
    return Array.from(this.executors.keys())
  }
}

/** 全局执行器工厂实例 */
export const executorFactory = ExecutorFactory.getInstance()
