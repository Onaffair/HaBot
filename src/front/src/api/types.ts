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

/** 用户黑名单 */
export interface UserBlacklist {
  id: number
  qq: string
  reason?: string
  createdAt: string
}

/** 资源段（受管目录） */
export interface ManagedResource {
  id: number
  name: string
  path: string
  keywords: string[]
  description?: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/** 触发规则 */
export interface CommandRule {
  id: number
  name: string
  description?: string | null
  enabled: boolean
  matchType: 'exact' | 'contains' | 'chars'
  keywords: string[]
  resourceName: string
  fileFilter?: string | null
  priority: number
  createdAt: string
  updatedAt: string
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

/** 资源段创建/更新载荷 */
export interface ManagedResourcePayload {
  name: string
  path: string
  keywords: string[]
  description?: string
  enabled?: boolean
}

/** 触发规则创建/更新载荷 */
export interface CommandRulePayload {
  name: string
  description?: string
  enabled?: boolean
  matchType: 'exact' | 'contains' | 'chars'
  keywords: string[]
  resourceName: string
  fileFilter?: string
  priority?: number
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
