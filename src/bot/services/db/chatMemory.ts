import { db } from '@utils/db'

export interface CreateChatMemoryInput {
  groupId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  raw?: string
}

export interface ChatMemoryFilter {
  groupId?: string
  userId?: string
  role?: 'user' | 'assistant'
  afterId?: number
  beforeId?: number
  limit?: number
  offset?: number
  orderBy?: 'createdAt_asc' | 'createdAt_desc' | 'id_asc' | 'id_desc'
}

class ChatMemoryService {
  /** 写入一条对话记录 */
  async create(data: CreateChatMemoryInput) {
    if (!db.chatMemory) return null
    return db.chatMemory.create({ data })
  }

  /** 根据 ID 查找 */
  async findById(id: number) {
    if (!db.chatMemory) return null
    return db.chatMemory.findUnique({ where: { id } })
  }

  /** 按条件查询对话记录 */
  async findMany(filter: ChatMemoryFilter = {}) {
    if (!db.chatMemory) return []
    const { groupId, userId, role, afterId, beforeId, limit = 50, offset = 0, orderBy = 'createdAt_desc' } = filter
    const orderByMap: Record<string, Record<string, 'asc' | 'desc'>> = {
      createdAt_asc: { createdAt: 'asc' },
      createdAt_desc: { createdAt: 'desc' },
      id_asc: { id: 'asc' },
      id_desc: { id: 'desc' }
    }
    return db.chatMemory.findMany({
      where: {
        ...(groupId ? { groupId } : {}),
        ...(userId ? { userId } : {}),
        ...(role ? { role } : {}),
        ...(afterId ? { id: { gt: afterId } } : {}),
        ...(beforeId ? { id: { lt: beforeId } } : {})
      },
      orderBy: orderByMap[orderBy] ?? { createdAt: 'desc' },
      skip: offset,
      take: limit
    })
  }

  /** 获取某个群组最近 N 条对话（按创建时间倒序） */
  async findRecent(groupId: string, limit = 20) {
    if (!db.chatMemory) return []
    return db.chatMemory.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /** 统计记录数 */
  async count(filter: { groupId?: string; afterId?: number } = {}) {
    if (!db.chatMemory) return 0
    const { groupId, afterId } = filter
    return db.chatMemory.count({
      where: {
        ...(groupId ? { groupId } : {}),
        ...(afterId ? { id: { gt: afterId } } : {})
      }
    })
  }

  /** 删除单条记录 */
  async delete(id: number) {
    if (!db.chatMemory) return null
    return db.chatMemory.delete({ where: { id } })
  }

  /** 批量删除指定 ID 之前的旧记录 */
  async deleteBeforeId(groupId: string, beforeId: number) {
    if (!db.chatMemory) return 0
    const result = await db.chatMemory.deleteMany({
      where: { groupId, id: { lte: beforeId } }
    })
    return result.count
  }
}

export const chatMemoryService = new ChatMemoryService()
export default ChatMemoryService