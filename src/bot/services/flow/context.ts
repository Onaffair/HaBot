import type { Session } from '@/core/session'
import type { MessageItem } from '@/interface/onebot'
import type { Canvas } from '@/services/db/canvas'
import type { FlowNode, FlowTraceStep } from './types'

// ============================================================================
// 流程执行上下文
// ----------------------------------------------------------------------------
// 一次画布流转期间的共享状态，承担三项职责：
//  1) 数据向后传递：以 variables 累积各节点产出，供下游经 {{路径}} 引用；
//  2) 消息暂存：message 节点把消息段推入 outbox，output 节点到达时取出发送；
//  3) 运行记录：trace 收集每个节点的执行轨迹，用于日志与异常定位。
// 上下文不持有引擎引用，节点执行器仅依赖本类暴露的读写方法。
// ============================================================================

/** {{路径}} 占位符：双大括号包裹点分路径，允许内部空白 */
const TEMPLATE_RE = /\{\{\s*([\w.$[\]]+)\s*\}\}/g

export class ExecutionContext {
  /** 累积的变量表：内置输入变量 + 各节点产出（按 node.id 与 label 双键写入） */
  readonly variables: Record<string, any> = {}
  /** 待发送消息段缓冲，output 节点到达即抽干发送 */
  readonly outbox: MessageItem[] = []
  /** 节点执行轨迹 */
  readonly trace: FlowTraceStep[] = []
  /** 已发送消息条数 */
  sent = 0

  constructor(readonly session: Session, readonly canvas: Canvas) {
    // 预置可读的输入变量，方便触发后的节点直接引用 {{text}} 等
    this.variables.input = session.textContent
    this.variables.text = session.textContent
    this.variables.sender = session.userId
    this.variables.groupId = session.groupId ?? ''
    this.variables.messageId = session.raw?.message_id ?? ''
    this.variables.nickname = session.raw?.sender?.nickname ?? session.raw?.sender?.card ?? ''
  }

  /**
   * 记录某节点的产出，向下游传递。
   * 同时以 node.id 与 node.data.label 两个键写入，二者均可作为 {{路径}} 的根；
   * label 存在时优先作为可读引用名（如 {{AI处理.output}}）。
   */
  record(node: FlowNode, data?: Record<string, any>): void {
    if (!data) return
    this.variables[node.id] = { ...(this.variables[node.id] || {}), ...data }
    const label = node.data?.label
    if (label) this.variables[label] = { ...(this.variables[label] || {}), ...data }
  }

  /** 按点分路径读取变量（如 'AI处理.output'、'text'）；缺失返回 undefined */
  resolve(path: string): any {
    const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
    let cur: any = this.variables
    for (const seg of segments) {
      if (cur == null) return undefined
      cur = cur[seg]
    }
    return cur
  }

  /**
   * 文本模板渲染：把 {{路径}} 替换为其解析值的可读形式。
   * 对象/数组按 JSON 序列化，字符串/数字直接输出，未命中替换为空串。
   */
  renderText(template?: string): string {
    if (!template) return ''
    return template.replace(TEMPLATE_RE, (_m, key: string) => {
      const val = this.resolve(key)
      if (val == null) return ''
      return typeof val === 'object' ? JSON.stringify(val) : String(val)
    })
  }

  /**
   * 表达式模板渲染：把 {{路径}} 替换为其 JSON 字面量，供条件节点求值。
   * 字符串会被加引号（'x' === "x" 成立），数字/布尔保持原样，保证比较语义正确。
   */
  renderExpr(expression?: string): string {
    if (!expression) return ''
    return expression.replace(TEMPLATE_RE, (_m, key: string) => JSON.stringify(this.resolve(key) ?? null))
  }

  /** 追加消息段到发送缓冲 */
  pushOutbox(items: MessageItem[]): void {
    this.outbox.push(...items)
  }

  /** 抽干并返回当前缓冲（output 节点调用后缓冲清空，避免重复发送） */
  drainOutbox(): MessageItem[] {
    const items = this.outbox.splice(0, this.outbox.length)
    return items
  }

  /** 记录一个节点的执行轨迹 */
  logStep(node: FlowNode, ok: boolean, error?: string): void {
    const step: FlowTraceStep = {
      nodeId: node.id,
      nodeLabel: node.data?.label ?? node.id,
      kind: String(node.type),
      ok,
      error,
      at: Date.now(),
    }
    this.trace.push(step)
  }
}
