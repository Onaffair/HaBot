import { createLogger } from '@/utils/logger'
import { judgeIsAtMe } from '@/utils/messageBuilder'
import { runtime } from '@/core/runtime'
import { canvasFlowLogService } from '@/services/db/canvasFlowLog'
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
//  2) run          —— 一条消息只选择一个画布执行（按画布 id 升序取首个命中的），
//                     从该画布命中的触发节点出发做广度优先流转，逐节点交执行器处理，
//                     执行器产出经 ExecutionContext 向后传递，output 节点落地发送；
//  3) 每个节点独立 try/catch，异常记入执行轨迹（trace）并写日志，单点失败不中断整体。
// 画布数据来自 Runtime 的启用画布缓存（启动/后端改动时同步），引擎本身不查库。
// 每次流转结果旁路写入画布日志（canvas_flow_logs），供管理界面回溯，写失败不影响主流程。
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

  /** 取画布中命中当前消息的首个触发节点（一个画布可有多个触发入口，只取其一） */
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

  /**
   * 为消息选取唯一执行画布：一条消息只匹配一个画布，不多个画布同时流转。
   * 画布缓存按 id 升序，多个画布命中时取最先命中的一个（即 id 最小者）；
   * 同一画布内多个触发入口命中时也只取首个入口。
   */
  private selectCanvas(session: Session): { canvas: Canvas; entries: FlowNode[] } | null {
    for (const canvas of runtime.getCanvases()) {
      const entries = this.matchedTriggers(canvas, session)
      if (entries.length > 0) {
        if (entries.length > 1) {
          logger.info(`Canvas '${canvas.name}' has ${entries.length} matched trigger(s), use the first one only`)
        }
        return { canvas, entries: [entries[0]] }
      }
    }
    return null
  }

  /** 流转消息命中的唯一画布；无命中画布时返回 null，不执行任何流程 */
  async run(session: Session): Promise<FlowRunResult | null> {
    const selected = this.selectCanvas(session)
    if (!selected) return null
    const { canvas, entries } = selected
    logger.info(`Message matched canvas '${canvas.name}' (#${canvas.id}), skip other canvases`)
    const result = await this.runCanvas(canvas, entries, session)
    this.pushRecent(result)
    this.persistLog(result, session)
    return result
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

  /**
   * 旁路落库本次流转摘要（群号 / 触发消息 / 状态 / 异常摘要 / 时间）。
   * 只要有一个节点失败即记为 error，异常摘要按「节点名(类型): 原因」拼装，
   * 供前端日志弹窗悬停查看；服务内部已吞异常，此处不阻塞流转。
   */
  private persistLog(result: FlowRunResult, session: Session): void {
    const failed = result.steps.filter((s) => !s.ok)
    void canvasFlowLogService.record({
      canvasId: result.canvasId,
      groupId: session.isGroup ? String(session.groupId ?? '') : '',
      message: session.textContent,
      status: failed.length > 0 ? 'error' : 'success',
      error: failed.length > 0 ? failed.map((s) => `${s.nodeLabel}(${s.kind}): ${s.error || '未知错误'}`).join('；') : null,
    })
  }

  /** 近期流转记录（只读快照），用于日志排查与外部观测 */
  getRecentRuns(): FlowRunResult[] {
    return [...this.recentRuns]
  }
}

/** 全局规则引擎实例 */
export const ruleEngine = RuleEngine.getInstance()
