// ============================================================================
// 通用/共享类型定义：所有 API 与视图层从 '@/api/types' 引入业务实体类型
// ============================================================================

/** 后端统一响应结构 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}

/** 分页结构 */
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 监听群组 */
export interface GroupListen {
  id: number
  groupId: string
  enabled: boolean
}

/** bot 加入过的群（画布 @ 对象级联的一级菜单，成员按需再拉） */
export interface JoinedGroupNode {
  groupId: string
  groupName: string
  /** 群人数，取不到时为 0（仅用于展示） */
  memberCount: number
}

/** 群成员（画布消息节点挑选 @ 对象用，级联二级菜单） */
export interface GroupMemberNode {
  /** QQ 号（字符串形式） */
  userId: string
  nickname: string
  /** 群名片，优先于昵称展示 */
  card?: string
}

/** 用户黑名单 */
export interface UserBlacklist {
  id: number
  qq: string
  reason?: string
  createdAt: string
}

/** 目录树节点 */
export interface FsNode {
  key: string
  label: string
  path: string
  isDir: boolean
  children?: FsNode[]
  leaf?: boolean
}

// ============================================================================
// 流程画布
// ============================================================================

/** 画布列表摘要（后端剔除 nodes/edges，仅附计数） */
export interface CanvasBrief {
  id: number
  name: string
  description?: string | null
  enabled: boolean
  nodeCount: number
  edgeCount: number
  createdAt: string
  updatedAt: string
}

/** 完整画布记录（nodes/edges 为 vue-flow 结构，后端透传存储） */
export interface CanvasRecord extends Omit<CanvasBrief, 'nodeCount' | 'edgeCount'> {
  nodes: Record<string, any>[]
  edges: Record<string, any>[]
  viewport?: { x: number; y: number; zoom: number } | null
}

/** 画布分页响应：顶层 { list, total }，与 useTable 解构约定一致 */
export interface CanvasPage {
  list: CanvasBrief[]
  total: number
  pageNum: number
  pageSize: number
}

/** 画布创建/更新载荷 */
export interface CanvasPayload {
  name?: string
  description?: string | null
  enabled?: boolean
  nodes?: Record<string, any>[]
  edges?: Record<string, any>[]
  viewport?: { x: number; y: number; zoom: number } | null
}

/** 画布流转状态：success=节点全部执行正常，error=存在节点异常（详情见 error） */
export type FlowLogStatus = 'success' | 'error'

/** 单条画布流转日志（规则引擎每次流转写一行） */
export interface CanvasFlowLog {
  id: number
  canvasId: number
  /** 群号，私聊触发时为空串 */
  groupId: string
  /** 触发流转的消息文本 */
  message: string
  status: FlowLogStatus
  /** 异常摘要「节点名(类型): 原因」，正常为空 */
  error?: string | null
  createdAt: string
}

/** 流转日志分页响应：同 CanvasPage，顶层 { list, total } */
export interface CanvasFlowLogPage {
  list: CanvasFlowLog[]
  total: number
  pageNum: number
  pageSize: number
}

// ============================================================================
// 系统配置（原 .env 配置项 DB 化）
// ============================================================================

/** 单条系统配置（含渲染元数据：type 决定控件、requiresRestart 决定保存后是否重启 Bot） */
export interface SystemConfigItem {
  id: number
  key: string
  value: string
  category: string
  label: string
  type: 'string' | 'number' | 'password'
  description?: string | null
  requiresRestart: boolean
  sortOrder: number
  updatedAt: string
}

/** 分组后的配置分区 */
export interface SystemConfigGroup {
  category: string
  label: string
  order: number
  items: SystemConfigItem[]
}

/** GET /api/system-configs 响应 */
export interface SystemConfigListResult {
  groups: SystemConfigGroup[]
}

/** PUT /api/system-configs 响应 */
export interface SystemConfigSaveResult {
  /** 实际写入的 key（值未变化的项不返回） */
  updated: string[]
  /** 保存后是否已自动重启 Bot */
  restarted: boolean
  /** 重启失败原因（成功或未触发重启时为空） */
  restartError?: string
}
