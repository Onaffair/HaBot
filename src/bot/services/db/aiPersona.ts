import { db } from '@utils/db'
import { createLogger } from '@utils/logger'

// ============================================================================
// AI 人格数据服务
// ----------------------------------------------------------------------------
// 对话机器人（aiChat）的系统人格提示词落库管理：一条 = 一个人格。
// 全表最多一条 isActive=true（当前生效人格），互斥收敛在本层保证：
// 设生效/新增生效时先清除其它生效项，避免同时有多个生效人格。
// ============================================================================

const logger = createLogger('AiPersona')

export interface CreatePersonaInput {
  name: string
  prompt: string
  isActive?: boolean
}

export interface UpdatePersonaInput {
  name?: string
  prompt?: string
}

class AiPersonaService {
  /** 获取当前生效人格（isActive=true），无则返回 null */
  async getActive() {
    if (!db.aiPersona) return null
    return db.aiPersona.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } })
  }

  /** 获取所有人格：生效的排在前，其余按 id 升序 */
  async findAll() {
    if (!db.aiPersona) return []
    return db.aiPersona.findMany({
      orderBy: [{ isActive: 'desc' }, { id: 'asc' }]
    })
  }

  /** 根据 id 查找单条 */
  async findById(id: number) {
    if (!db.aiPersona) return null
    return db.aiPersona.findUnique({ where: { id } })
  }

  /** 根据人格名称查找单条（name 唯一） */
  async findByName(name: string) {
    if (!db.aiPersona) return null
    return db.aiPersona.findUnique({ where: { name } })
  }

  /** 新增人格：表内为空时首条自动生效；显式要求生效时先清除其它生效项 */
  async create(data: CreatePersonaInput) {
    if (!db.aiPersona) return null
    const total = await db.aiPersona.count()
    // 首条默认生效，保证 aiChat 开箱即有可用提示词
    const isActive = data.isActive ?? total === 0
    if (isActive) await this.clearActive()
    return db.aiPersona.create({
      data: { name: data.name, prompt: data.prompt, isActive }
    })
  }

  /** 更新人格名称与提示词 */
  async update(id: number, data: UpdatePersonaInput) {
    if (!db.aiPersona) return null
    return db.aiPersona.update({ where: { id }, data })
  }

  /** 设为当前生效人格：先清掉其它生效项，保证全表只有一条 isActive=true */
  async setActive(id: number) {
    if (!db.aiPersona) return null
    const target = await db.aiPersona.findUnique({ where: { id } })
    if (!target) {
      logger.warn('setActive: persona not found', { id })
      return null
    }
    await this.clearActive()
    return db.aiPersona.update({ where: { id }, data: { isActive: true } })
  }

  /** 删除人格 */
  async remove(id: number) {
    if (!db.aiPersona) return null
    return db.aiPersona.delete({ where: { id } })
  }

  /** 清除全部生效标记（内部用于维持互斥） */
  private async clearActive() {
    if (!db.aiPersona) return
    await db.aiPersona.updateMany({ where: { isActive: true }, data: { isActive: false } })
  }
}

export const aiPersonaService = new AiPersonaService()
export default AiPersonaService
