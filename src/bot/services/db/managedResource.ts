import { db } from '@utils/db'

/** 数据库字段中 keywords 为 JSON 数组字符串，进出模型时统一以数组形式交互 */
export interface ManagedResource {
  id: number
  name: string
  path: string
  keywords: string[]
  description?: string | null
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateResourceInput {
  name: string
  path: string
  keywords?: string[]
  description?: string
  enabled?: boolean
}

export interface UpdateResourceInput {
  name?: string
  path?: string
  keywords?: string[]
  description?: string | null
  enabled?: boolean
}

function normalize<T extends { keywords?: string }>(row: T): any {
  if (!row) return row
  let arr: string[] = []
  if (row.keywords) {
    try {
      const parsed = JSON.parse(row.keywords)
      arr = Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : []
    } catch {
      // 兼容逗号分隔的旧数据
      arr = row.keywords.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    }
  }
  return { ...row, keywords: arr }
}

class ManagedResourceService {
  /** 获取所有资源段 */
  async findAll(): Promise<ManagedResource[]> {
    if (!db.managedResource) return []
    const rows = await db.managedResource.findMany({ orderBy: { id: 'asc' } })
    return rows.map(normalize)
  }

  /** 获取所有已启用的资源段 */
  async findEnabled(): Promise<ManagedResource[]> {
    if (!db.managedResource) return []
    const rows = await db.managedResource.findMany({ where: { enabled: true } })
    return rows.map(normalize)
  }

  /** 根据 ID 查找 */
  async findById(id: number): Promise<ManagedResource | null> {
    if (!db.managedResource) return null
    const row = await db.managedResource.findUnique({ where: { id } })
    return row ? normalize(row) : null
  }

  /** 根据名称查找 */
  async findByName(name: string): Promise<ManagedResource | null> {
    if (!db.managedResource) return null
    const row = await db.managedResource.findUnique({ where: { name } })
    return row ? normalize(row) : null
  }

  /** 创建资源段 */
  async create(data: CreateResourceInput) {
    if (!db.managedResource) return null
    const row = await db.managedResource.create({
      data: {
        name: data.name,
        path: data.path,
        keywords: JSON.stringify(data.keywords || []),
        description: data.description ?? null,
        enabled: data.enabled ?? true,
      },
    })
    return normalize(row)
  }

  /** 更新资源段 */
  async update(id: number, data: UpdateResourceInput) {
    if (!db.managedResource) return null
    const patch: any = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.path !== undefined) patch.path = data.path
    if (data.keywords !== undefined) patch.keywords = JSON.stringify(data.keywords)
    if (data.description !== undefined) patch.description = data.description
    if (data.enabled !== undefined) patch.enabled = data.enabled

    const row = await db.managedResource.update({ where: { id }, data: patch })
    return normalize(row)
  }

  /** 删除资源段 */
  async delete(id: number) {
    if (!db.managedResource) return null
    return db.managedResource.delete({ where: { id } })
  }
}

export const managedResourceService = new ManagedResourceService()
export default ManagedResourceService
