import { db } from '@utils/db'

/** keywords 字段在库中为 JSON 数组字符串，对外以数组形式交互 */
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
  createdAt: Date
  updatedAt: Date
}

export interface CreateRuleInput {
  name: string
  description?: string
  enabled?: boolean
  matchType?: string
  keywords?: string[]
  resourceName: string
  fileFilter?: string
  priority?: number
}

export interface UpdateRuleInput {
  name?: string
  description?: string | null
  enabled?: boolean
  matchType?: string
  keywords?: string[]
  resourceName?: string
  fileFilter?: string | null
  priority?: number
}

const VALID_MATCH_TYPES = ['exact', 'contains', 'chars']

function normalize(row: any): any {
  if (!row) return row
  let arr: string[] = []
  if (row.keywords) {
    try {
      const parsed = JSON.parse(row.keywords)
      arr = Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : []
    } catch {
      arr = row.keywords.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean)
    }
  }
  return {
    ...row,
    keywords: arr,
    matchType: VALID_MATCH_TYPES.includes(row.matchType) ? row.matchType : 'contains',
  }
}

class CommandRuleService {
  /** 获取所有触发规则 */
  async findAll(): Promise<CommandRule[]> {
    if (!db.commandRule) return []
    const rows = await db.commandRule.findMany({ orderBy: [{ priority: 'desc' }, { id: 'asc' }] })
    return rows.map(normalize)
  }

  /** 获取所有已启用的触发规则 */
  async findEnabled(): Promise<CommandRule[]> {
    if (!db.commandRule) return []
    const rows = await db.commandRule.findMany({
      where: { enabled: true },
      orderBy: [{ priority: 'desc' }, { id: 'asc' }],
    })
    return rows.map(normalize)
  }

  /** 根据 ID 查找 */
  async findById(id: number): Promise<CommandRule | null> {
    if (!db.commandRule) return null
    const row = await db.commandRule.findUnique({ where: { id } })
    return row ? normalize(row) : null
  }

  /** 根据名称查找 */
  async findByName(name: string): Promise<CommandRule | null> {
    if (!db.commandRule) return null
    const row = await db.commandRule.findUnique({ where: { name } })
    return row ? normalize(row) : null
  }

  /** 创建规则 */
  async create(data: CreateRuleInput) {
    if (!db.commandRule) return null
    const row = await db.commandRule.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        enabled: data.enabled ?? true,
        matchType: VALID_MATCH_TYPES.includes(data.matchType as string) ? (data.matchType as string) : 'contains',
        keywords: JSON.stringify(data.keywords || []),
        resourceName: data.resourceName,
        fileFilter: data.fileFilter ?? null,
        priority: data.priority ?? 0,
      },
    })
    return normalize(row)
  }

  /** 更新规则 */
  async update(id: number, data: UpdateRuleInput) {
    if (!db.commandRule) return null
    const patch: any = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.enabled !== undefined) patch.enabled = data.enabled
    if (data.matchType !== undefined)
      patch.matchType = VALID_MATCH_TYPES.includes(data.matchType) ? data.matchType : 'contains'
    if (data.keywords !== undefined) patch.keywords = JSON.stringify(data.keywords)
    if (data.resourceName !== undefined) patch.resourceName = data.resourceName
    if (data.fileFilter !== undefined) patch.fileFilter = data.fileFilter
    if (data.priority !== undefined) patch.priority = data.priority

    const row = await db.commandRule.update({ where: { id }, data: patch })
    return normalize(row)
  }

  /** 删除规则 */
  async delete(id: number) {
    if (!db.commandRule) return null
    return db.commandRule.delete({ where: { id } })
  }
}

export const commandRuleService = new CommandRuleService()
export default CommandRuleService
