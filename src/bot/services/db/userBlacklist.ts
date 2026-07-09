import { db } from '@utils/db'

class UserBlacklistService {
  /** 添加黑名单 */
  async add(qq: string, reason?: string) {
    if (!db.userBlacklist) return null
    return db.userBlacklist.create({
      data: { qq, reason }
    })
  }

  /** 根据 QQ 号查找 */
  async findByQq(qq: string) {
    if (!db.userBlacklist) return null
    return db.userBlacklist.findUnique({ where: { qq } })
  }

  /** 获取所有黑名单用户 */
  async findAll() {
    if (!db.userBlacklist) return []
    return db.userBlacklist.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }

  /** 判断是否在黑名单中 */
  async isBlacklisted(qq: string): Promise<boolean> {
    if (!db.userBlacklist) return false
    const record = await db.userBlacklist.findUnique({ where: { qq } })
    return record !== null
  }

  /** 更新拉黑原因 */
  async updateReason(qq: string, reason: string) {
    if (!db.userBlacklist) return null
    return db.userBlacklist.update({
      where: { qq },
      data: { reason }
    })
  }

  /** 移出黑名单 */
  async remove(qq: string) {
    if (!db.userBlacklist) return null
    return db.userBlacklist.delete({ where: { qq } })
  }

  /** 统计黑名单人数 */
  async count(): Promise<number> {
    if (!db.userBlacklist) return 0
    return db.userBlacklist.count()
  }
}

export const userBlacklistService = new UserBlacklistService()
export default UserBlacklistService