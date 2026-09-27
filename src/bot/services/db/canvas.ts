import { db } from '@utils/db'

// ============================================================================
// 流程画布数据服务
// ----------------------------------------------------------------------------
// 画布节点/连线/视口在库内以 JSON 字符串存储，对外统一以结构化对象交互，
// 序列化与反解析全部收敛在本层，路由与前端无需感知存储格式。
// ============================================================================

/** vue-flow 节点/连线为任意结构，后端只负责透传存储，不解析内部字段 */
export type CanvasJson = Record<string, any>

/** 对外画布模型：nodes/edges 为数组，viewport 为对象或 null */
export interface Canvas {
  id: number
  name: string
  description?: string | null
  enabled: boolean
  nodes: CanvasJson[]
  edges: CanvasJson[]
  viewport?: CanvasJson | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateCanvasInput {
  name: string
  description?: string
  enabled?: boolean
  nodes?: CanvasJson[]
  edges?: CanvasJson[]
  viewport?: CanvasJson | null
}

export interface UpdateCanvasInput {
  name?: string
  description?: string | null
  enabled?: boolean
  nodes?: CanvasJson[]
  edges?: CanvasJson[]
  viewport?: CanvasJson | null
}

/** 安全解析 JSON 数组字段；解析失败或类型不符回退为空数组 */
function parseArray(raw?: string | null): CanvasJson[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 安全解析 JSON 对象字段；解析失败回退为 null */
function parseObject(raw?: string | null): CanvasJson | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/** 数据库行 → 对外模型（JSON 字符串字段还原为结构） */
function normalize(row: any): Canvas {
  return {
    ...row,
    nodes: parseArray(row.nodes),
    edges: parseArray(row.edges),
    viewport: parseObject(row.viewport),
  }
}

class CanvasService {
  /** 获取所有画布 */
  async findAll(): Promise<Canvas[]> {
    if (!db.canvas) return []
    const rows = await db.canvas.findMany({ orderBy: { id: 'asc' } })
    return rows.map(normalize)
  }

  /**
   * 分页查询（列表维护场景）
   * 返回 { list, total } 顶层结构，与前端 useTable 的解构约定直接对接；
   * keyword 按名称模糊匹配，默认按更新时间倒序。
   */
  async findPaged(q: { skip: number; take: number; keyword?: string }): Promise<{ list: Canvas[]; total: number }> {
    if (!db.canvas) return { list: [], total: 0 }
    const where = q.keyword ? { name: { contains: q.keyword } } : {}
    const [rows, total] = await Promise.all([
      db.canvas.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: q.skip, take: q.take }),
      db.canvas.count({ where }),
    ])
    return { list: rows.map(normalize), total }
  }

  /** 获取所有已启用的画布（供底层执行流程加载） */
  async findEnabled(): Promise<Canvas[]> {
    if (!db.canvas) return []
    const rows = await db.canvas.findMany({ where: { enabled: true }, orderBy: { id: 'asc' } })
    return rows.map(normalize)
  }

  /** 根据 ID 查找 */
  async findById(id: number): Promise<Canvas | null> {
    if (!db.canvas) return null
    const row = await db.canvas.findUnique({ where: { id } })
    return row ? normalize(row) : null
  }

  /** 根据名称查找 */
  async findByName(name: string): Promise<Canvas | null> {
    if (!db.canvas) return null
    const row = await db.canvas.findUnique({ where: { name } })
    return row ? normalize(row) : null
  }

  /** 创建画布 */
  async create(data: CreateCanvasInput) {
    if (!db.canvas) return null
    const row = await db.canvas.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        enabled: data.enabled ?? true,
        nodes: JSON.stringify(data.nodes || []),
        edges: JSON.stringify(data.edges || []),
        viewport: data.viewport ? JSON.stringify(data.viewport) : null,
      },
    })
    return normalize(row)
  }

  /** 更新画布（仅覆盖传入字段） */
  async update(id: number, data: UpdateCanvasInput) {
    if (!db.canvas) return null
    const patch: any = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.enabled !== undefined) patch.enabled = data.enabled
    if (data.nodes !== undefined) patch.nodes = JSON.stringify(data.nodes)
    if (data.edges !== undefined) patch.edges = JSON.stringify(data.edges)
    if (data.viewport !== undefined) patch.viewport = data.viewport ? JSON.stringify(data.viewport) : null

    const row = await db.canvas.update({ where: { id }, data: patch })
    return normalize(row)
  }

  /** 删除画布 */
  async delete(id: number) {
    if (!db.canvas) return null
    return db.canvas.delete({ where: { id } })
  }
}

export const canvasService = new CanvasService()
export default CanvasService
