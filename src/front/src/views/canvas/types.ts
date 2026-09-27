// ============================================================================
// 画布节点类型定义
// ----------------------------------------------------------------------------
// 本文件集中定义「节点抽象」与「每一类节点的具体数据形状」：
// - 抽象层：GraphNodeData (所有节点数据的公共字段)、NodeHandleSpec (端点定义)、
//   NodeDefinition (节点描述: 组件 + 表单 + 默认数据 + 端口, 供注册表存取)
// - 具体层：TriggerNodeData / AiNodeData / ConditionNodeData / OutputNodeData
//   分别对应一类节点在画布上承载的业务配置
// 约定：不使用 enum，节点类别一律用字符串字面量联合类型 (NodeKind) 表达；
// 表单 schema 复用项目内配置驱动表单 BaseForm 的类型 (FormSchema)
// ============================================================================
import type { Component } from 'vue'
import type { FormSchema } from '@/component/antd'

// ============================================================================
// 节点抽象定义
// ============================================================================

/** 画布中所有节点类别 (新增节点类型时在此登记字面量) */
export type NodeKind = 'trigger' | 'ai' | 'condition' | 'output' | 'message'

/** 所有节点数据共享的基础字段 */
export interface BaseNodeData {
  /** 节点显示名称 */
  label: string
  /** 节点备注说明 (可选, 展示在节点副标题) */
  description?: string
}

/**
 * 联合: 画布节点的通用数据载体
 * 注册表与 BaseForm 交互时使用宽松类型, 具体节点组件内再按需收窄到各自 XxxNodeData
 */
export type GraphNodeData = BaseNodeData & Record<string, any>

/** 节点连接端点 (Handle) 描述 */
export interface NodeHandleSpec {
  /** 端点 id, 边的 source/target 引用此值; 单端点约定用 'default' */
  id: string
  /** 端点方向: target 在左侧接收, source 在右侧输出 */
  type: 'target' | 'source'
  /** 端点标签 (多出口节点用于区分, 如条件的 true/false) */
  label?: string
}

/** 单个节点类别的完整描述, 存入 NodeFactory 注册表 */
export interface NodeDefinition<TData extends GraphNodeData = GraphNodeData> {
  /** 节点类别标识, 与 vue-flow 的 node.type 对应 */
  type: NodeKind
  /** 展示名称 (工具栏 / 节点标题) */
  label: string
  /** 节点图标 (emoji 或字形), 展示在标题左侧 */
  icon?: string
  /** 主题色, 用于节点边框与工具栏标签 */
  color?: string
  /** 自定义节点组件 (由 BaseNode 承载外观) */
  component: Component
  /** 端口声明: 输入 / 输出端点集合 */
  handles: NodeHandleSpec[]
  /** 该节点对应的配置表单 schema (驱动 BaseForm 渲染); 无配置节点 (如输出) 可省略 */
  formSchema?: FormSchema
  /** 新建节点时的默认数据工厂 */
  createData: () => TData
}

// ============================================================================
// 具体节点数据定义
// ============================================================================

/** 触发节点: 消息进入画布的入口, 描述命中条件 */
export interface TriggerNodeData extends BaseNodeData {
  /** 是否要求 @机器人: 是 / 否 / 任意 */
  atMe: 'yes' | 'no' | 'any'
  /** 关键词列表 (命中任一即触发) */
  keywords: string[]
  /** 正则表达式字符串 (可选, 非空时参与匹配) */
  pattern?: string
}

/** AI 处理节点: 调用大模型做一轮生成/理解 */
export interface AiNodeData extends BaseNodeData {
  /** 目标模型标识 */
  model: string
  /** 系统提示词 */
  systemPrompt: string
  /** 采样温度 0-2 */
  temperature: number
  /** 最大输出 token 数 */
  maxTokens: number
}

/** 条件节点: 按表达式布尔结果分流, 拥有 true / false 两个出口 */
export interface ConditionNodeData extends BaseNodeData {
  /** 判定表达式 (约定作用域内可访问上游节点输出) */
  expression: string
}

/**
 * 输出节点: 流程终点, 到达即把上游消息构建节点产出的消息发送出去。
 * 本身无任何业务配置 (消息内容在 message 节点配置), 仅保留基础展示字段。
 */
export type OutputNodeData = BaseNodeData

// ============================================================================
// 消息构建节点 —— 消息段类型与节点数据
// ----------------------------------------------------------------------------
// 参考后端 src/bot/interface/onebot.ts 的 MessageItem 联合类型 (265-290 行)，
// 提取常用子集供画布配置; 新增段类型时同步扩展 MessageSegmentType 即可。
// ============================================================================

/** 画布支持配置的消息段类型 (对齐 OB11 段 type 字段) */
export type MessageSegmentType = 'text' | 'at' | 'image' | 'video' | 'record' | 'face' | 'poke'

/**
 * 单条消息段的前端配置态
 * 与后端 OB11MessageXxx 段有一一对应关系, 最终序列化时按 type 映射到对应结构
 */
export interface MessageSegment {
  /** 段类型, 与 OB11 消息段 type 对应 */
  type: MessageSegmentType
  /** text 段内容 */
  text?: string
  /** at 段目标 QQ 号 ('all' 表示 @全体) */
  qq?: string
  /** at 段显示昵称 (可选, 仅展示用) */
  name?: string
  /** image / video / record 段的资源路径: 末段带扩展名视为具体文件, 否则为目录 (发送时随机选取) */
  file?: string
  /** face 段表情 ID (字符串形式的数字, 对齐 OB11MessageFace.data.id) */
  faceId?: string
  /** poke 段子类型标识 (对齐 OB11MessagePoke.data.type) */
  pokeType?: string
}

/** 消息构建节点: 按顺序组装一个 OneBot 消息段数组 */
export interface MessageNodeData extends BaseNodeData {
  /** 消息段列表 (按顺序构成最终发送的消息) */
  segments: MessageSegment[]
}
