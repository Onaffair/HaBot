import { db } from '@utils/db'

export interface CreateSummaryInput {
  groupId: string
  summary: string
  sinceId: number
}

class MemorySummaryService {
  /** 创建摘要 */
  async create(data: CreateSummaryInput) {
    if (!db.memorySummary) return null
    return db.memorySummary.create({ data })
  }

  /** 根据 ID 查找 */
  async findById(id: number) {
    if (!db.memorySummary) return null
    return db.memorySummary.findUnique({ where: { id } })
  }

  /** 获取某个群组最近 N 条摘要 */
  async findRecent(groupId: string, limit = 3) {
    if (!db.memorySummary) return []
    return db.memorySummary.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /** 获取某个群组最新的摘要 */
  async findLatest(groupId: string) {
    if (!db.memorySummary) return null
    return db.memorySummary.findFirst({
      where: { groupId },
      orderBy: { createdAt: 'desc' }
    })
  }

  /** 删除单条摘要 */
  async delete(id: number) {
    if (!db.memorySummary) return null
    return db.memorySummary.delete({ where: { id } })
  }

  /** 删除某个群组的所有摘要 */
  async deleteByGroup(groupId: string) {
    if (!db.memorySummary) return 0
    const result = await db.memorySummary.deleteMany({ where: { groupId } })
    return result.count
  }
}

export const memorySummaryService = new MemorySummaryService()
export default MemorySummaryService