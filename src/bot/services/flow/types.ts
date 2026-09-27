// ============================================================================
// 规则引擎类型定义
// ----------------------------------------------------------------------------
// 画布在前端以 vue-flow 结构（nodes/edges）落库，后端引擎不依赖前端代码，
// 此处独立声明引擎所需的节点/连线/执行器/上下文数据形状，与前端
// src/front/src/views/canvas/types.ts 的节点 data 键保持一致约定：
//  - 节点类别一律用字符串字面量联合类型（不使用 enum）
//  - 各 XxxNodeData 对应一类节点在画布上承载的业务配置
// ============================================================================

/** 画布中所有节点类别（与前端 node.type 对应） */
export type NodeKind = 'trigger' | 'ai' | 'condition' | 'output' | 'message'

/** 所有节点数据共享的基础字段 */
export interface BaseNodeData {
  /** 节点显示名称，同时作为数据向后传递时的可读引用名 */
  label: string
  /** 节点备注说明（可选） */
  description?: string
}

/** 触发节点：消息进入画布的入口，描述命中条件 */
export interface TriggerNodeData extends BaseNodeData {
  /** 是否要求 @机器人：是 / 否 / 任意 */
  atMe?: 'yes' | 'no' | 'any'
  /** 关键词列表（命中任一即触发；为空表示不做关键词限制） */
  keywords?: string[]
  /** 正则表达式字符串（可选，非空时参与匹配） */
  pattern?: string
}

/** AI 处理节点：调用大模型做一轮生成/理解 */
export interface AiNodeData extends BaseNodeData {
  /** 目标模型标识 */
  model?: string
  /** 系统提示词（支持 {{路径}} 引用上游数据） */
  systemPrompt?: string
  /** 采样温度 0-2 */
  temperature?: number
  /** 最大输出 token 数 */
  maxTokens?: number
}

/** 条件节点：按表达式布尔结果分流，拥有 true / false 两个出口 */
export interface ConditionNodeData extends BaseNodeData {
  /** 判定表达式（作用域内可经 {{路径}} 访问上游节点输出） */
  expression?: string
}

/** 输出节点：流程终点，到达即把上游产出的消息发送出去，无自身配置 */
export type OutputNodeData = BaseNodeData

/** 画布支持配置的消息段类型（对齐 OB11 段 type 字段） */
export type MessageSegmentType = 'text' | 'at' | 'image' | 'video' | 'record' | 'face' | 'poke'

/** 单条消息段的画布配置态 */
export interface MessageSegment {
  /** 段类型，与 OB11 消息段 type 对应 */
  type: MessageSegmentType
  /** text 段内容（支持 {{路径}} 引用上游数据） */
  text?: string
  /** at 段目标 QQ 号（'all' 表示 @全体） */
  qq?: string
  /** at 段显示昵称（可选，仅展示用） */
  name?: string
  /** image / video / record 段的资源路径：末段带扩展名视为具体文件，否则为目录（发送时随机选取） */
  file?: string
  /** face 段表情 ID（字符串形式的数字） */
  faceId?: string
  /** poke 段子类型标识 */
  pokeType?: string
}

/** 消息构建节点：按顺序组装一个 OneBot 消息段数组 */
export interface MessageNodeData extends BaseNodeData {
  /** 消息段列表（按顺序构成最终发送的消息） */
  segments?: MessageSegment[]
}

/** 节点 data 的宽松载体：基础字段 + 各节点自定义键 */
export type FlowNodeData = BaseNodeData & Record<string, any>

/** vue-flow 节点：引擎只关心 id/type/data */
export interface FlowNode {
  id: string
  type: NodeKind | string
  position?: { x: number; y: number }
  data: FlowNodeData
}

/** vue-flow 连线：condition 节点经 sourceHandle('true'/'false') 区分出口 */
export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

/**
 * 节点执行结果。
 * @property data   向下游传递的数据（合并进执行上下文，供后续节点 {{路径}} 引用）
 * @property branch 分支标识（条件节点返回 'true'/'false'，供引擎按 sourceHandle 选路）
 */
export interface NodeResult {
  data?: Record<string, any>
  branch?: string
}

/** 单个节点的执行器契约：一类节点一个实现，经工厂自注册 */
export interface NodeExecutor {
  /** 负责的节点类别 */
  kind: NodeKind
  /** 执行入口：读取节点 data 与上下文，产出向下游传递的数据/分支 */
  run: (ctx: import('./context').ExecutionContext, node: FlowNode) => Promise<NodeResult | void> | NodeResult | void
}

/** 单个节点的执行轨迹（日志与异常记录的最小单元） */
export interface FlowTraceStep {
  nodeId: string
  nodeLabel: string
  kind: string
  /** 该节点是否成功执行 */
  ok: boolean
  /** 失败时的错误信息 */
  error?: string
  /** 时间戳（毫秒） */
  at: number
}

/** 一次画布流转的运行结果 */
export interface FlowRunResult {
  canvasId: number
  canvasName: string
  /** 依次经过的节点轨迹 */
  steps: FlowTraceStep[]
  /** 实际发送出去的消息条数（output 节点命中次数） */
  sent: number
  /** 流转是否因异常中断 */
  aborted: boolean
}
