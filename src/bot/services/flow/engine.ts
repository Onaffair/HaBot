import { createLogger } from '@/utils/logger'
import { judgeIsAtMe } from '@/utils/message'
import { runtime } from '@/core/runtime'
import type { Session } from '@/core/session'
import type { Canvas } from '@/services/db/canvas'
import { ExecutionContext } from './context'
import { executorFactory } from './executorFactory'
import type { FlowEdge, FlowNode, FlowRunResult, NodeKind, NodeResult, TriggerNodeData } from './types'

// ============================================================================
// 规则引擎（单例）
// ----------------------------------------------------------------------------
// 以「触发器为起点、消息发送为终点」，按画布（canvas）配置的节点与连线流转：
//  1) matchTrigger —— 纯判断画布入口触发节点是否命中当前消息（供命令 match 复用）；
//  2) run          —— 从命中的触发节点出发做广度优先流转，逐节点交执行器处理，
//                     执行器产出经 ExecutionContext 向后传递，output 节点落地发送；
//  3) 每个节点独立 try/catch，异常记入执行轨迹（trace）并写日志，单点失败不中断整体。
// 画布数据来自 Runtime 的启用画布缓存（启动/后端改动时同步），引擎本身不查库。
// ============================================================================

const logger = createLogger('RuleEngine')

/** 单画布流转的最大步数，防御环状/畸形连线导致的无限流转 */
const MAX_STEPS = 200

/** 近期运行结果环形缓冲容量，便于外部观测最近流转 */
const RECENT_RUNS_LIMIT = 50

export class RuleEngine {
  private static instance: RuleEngine
  /** 最近若干次流转结果（含轨迹），供诊断/前端观测 */
  private recentRuns: FlowRunResult[] = []

  private constructor() {}

  static getInstance(): RuleEngine {
    if (!RuleEngine.instance) {
      RuleEngine.instance = new RuleEngine()
    }
    return RuleEngine.instance
  }

  // ==========================================================================
  // 触发匹配
  // ==========================================================================

  /** 判断单个触发节点配置是否命中当前消息（纯函数，无副作用） */
  private matchTriggerData(data: TriggerNodeData, session: Session): boolean {
    const atMe = data.atMe ?? 'any'
    const isAt = judgeIsAtMe(session)
    if (atMe === 'yes' && !isAt) return false
    if (atMe === 'no' && isAt) return false

    const text = session.textContent
    const keywords = (data.keywords || []).filter((k) => k && k.trim())
    if (keywords.length > 0 && !keywords.some((k) => text.includes(k))) return false

    if (data.pattern) {
      try {
        if (!new RegExp(data.pattern).test(text)) return false
      } catch (e: any) {
        // 正则非法：视为不命中并告警，避免影响其它画布判定
        logger.warn(`Invalid trigger pattern "${data.pattern}": ${e?.message || e}`)
        return false
      }
    }
    return true
  }

  /** 取画布中命中当前消息的触发节点（一个画布可有多个触发入口） */
  private matchedTriggers(canvas: Canvas, session: Session): FlowNode[] {
    return (canvas.nodes as FlowNode[]).filter(
      (n) => n.type === 'trigger' && this.matchTriggerData(n.data as TriggerNodeData, session),
    )
  }

  /** 是否存在任一启用画布的触发器命中该消息（供命令 match 快速判断，不执行流转） */
  existsMatch(session: Session): boolean {
    return runtime.getCanvases().some((canvas) => this.matchedTriggers(canvas, session).length > 0)
  }

  // ==========================================================================
  // 流转执行
  // ==========================================================================

  /** 对所有命中的启用画布依次流转，返回每个画布的运行结果 */
  async run(session: Session): Promise<FlowRunResult[]> {
    const results: FlowRunResult[] = []
    for (const canvas of runtime.getCanvases()) {
      const entries = this.matchedTriggers(canvas, session)
      if (entries.length === 0) continue
      const result = await this.runCanvas(canvas, entries, session)
      results.push(result)
      this.pushRecent(result)
    }
    return results
  }

  /** 单画布流转：从给定触发入口节点做广度优先，逐节点执行并按连线选路 */
  private async runCanvas(canvas: Canvas, entries: FlowNode[], session: Session): Promise<FlowRunResult> {
    const ctx = new ExecutionContext(session, canvas)
    const nodesById = new Map<string, FlowNode>()
    const outEdges = new Map<string, FlowEdge[]>()
    this.buildIndex(canvas, nodesById, outEdges)

    const queue: FlowNode[] = [...entries]
    const visited = new Set<string>()
    let steps = 0
    let aborted = false

    while (queue.length > 0 && steps < MAX_STEPS) {
      const node = queue.shift()!
      if (visited.has(node.id)) continue
      visited.add(node.id)
      steps++

      const executor = executorFactory.get(node.type as NodeKind)
      if (!executor) {
        logger.warn(`No executor for node kind '${node.type}' (node ${node.id}), skip`)
        ctx.logStep(node, false, `no executor for ${node.type}`)
        continue
      }

      let branch: string | undefined
      try {
        const result = (await executor.run(ctx, node)) as NodeResult | undefined
        if (result?.data) ctx.record(node, result.data)
        branch = result?.branch
        ctx.logStep(node, true)
        logger.info(`Node [${node.type}] ${node.data?.label ?? node.id} executed${branch ? ` -> ${branch}` : ''}`)
      } catch (e: any) {
        // 节点级异常：记录后继续处理其它分支，不让整条画布崩溃
        aborted = true
        const msg = e?.message || String(e)
        ctx.logStep(node, false, msg)
        logger.error(`Node [${node.type}] ${node.data?.label ?? node.id} failed: ${msg}`)
        continue
      }

      for (const next of this.nextNodes(node, branch, nodesById, outEdges)) {
        queue.push(next)
      }
    }

    if (queue.length > 0) {
      logger.warn(`Canvas '${canvas.name}' flow truncated at MAX_STEPS=${MAX_STEPS}`)
    }

    const result: FlowRunResult = {
      canvasId: canvas.id,
      canvasName: canvas.name,
      steps: ctx.trace,
      sent: ctx.sent,
      aborted,
    }
    logger.info(
      `Canvas '${canvas.name}' finished: ${ctx.trace.length} node(s), ${ctx.sent} message(s) sent${aborted ? ' (with errors)' : ''}`,
    )
    return result
  }

  /** 依当前节点类型与分支结果计算后继节点 */
  private nextNodes(
    node: FlowNode,
    branch: string | undefined,
    nodesById: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
  ): FlowNode[] {
    const edges = outEdges.get(node.id) || []
    // 条件节点按 sourceHandle('true'/'false') 选路；其余节点沿用全部出边
    const selected =
      node.type === 'condition' ? edges.filter((e) => (e.sourceHandle ?? 'default') === branch) : edges

    const next: FlowNode[] = []
    for (const edge of selected) {
      const target = nodesById.get(edge.target)
      if (target) next.push(target)
    }
    return next
  }

  /** 构建节点索引与出边邻接表 */
  private buildIndex(
    canvas: Canvas,
    nodesById: Map<string, FlowNode>,
    outEdges: Map<string, FlowEdge[]>,
  ): void {
    for (const node of canvas.nodes as FlowNode[]) {
      nodesById.set(node.id, node)
    }
    for (const edge of canvas.edges as FlowEdge[]) {
      if (!edge?.source || !edge?.target) continue
      const list = outEdges.get(edge.source) || []
      list.push(edge)
      outEdges.set(edge.source, list)
    }
  }

  /** 追加运行结果到有界缓冲，超出容量丢弃最旧 */
  private pushRecent(result: FlowRunResult): void {
    this.recentRuns.push(result)
    if (this.recentRuns.length > RECENT_RUNS_LIMIT) this.recentRuns.shift()
  }

  /** 近期流转记录（只读快照），用于日志排查与外部观测 */
  getRecentRuns(): FlowRunResult[] {
    return [...this.recentRuns]
  }
}

/** 全局规则引擎实例 */
export const ruleEngine = RuleEngine.getInstance()
