import { db } from '@utils/db'

// ============================================================================
// 用户数字画像数据服务
// ----------------------------------------------------------------------------
// 存储按 QQ 用户维度的 AI 画像总结，供后续记忆功能读取。
// 画像由对话循环结束后的独立 AI 请求生成，这里只负责落库：按 qq 唯一 upsert 覆盖。
// ============================================================================

export interface UpsertProfileInput {
  nickname?: string
  profile: string
}

class UserProfileService {
  /** 按 QQ 查询画像 */
  async findByQq(qq: string) {
    if (!db.userProfile) return null
    return db.userProfile.findUnique({ where: { qq } })
  }

  /** 写入/更新画像：存在则覆盖 profile/nickname，不存在则新建 */
  async upsert(qq: string, data: UpsertProfileInput) {
    if (!db.userProfile) return null
    return db.userProfile.upsert({
      where: { qq },
      update: { profile: data.profile, nickname: data.nickname ?? '' },
      create: { qq, profile: data.profile, nickname: data.nickname ?? '' },
    })
  }

  /** 获取所有画像（管理/调试用） */
  async findAll() {
    if (!db.userProfile) return []
    return db.userProfile.findMany({ orderBy: { updatedAt: 'desc' } })
  }
}

export const userProfileService = new UserProfileService()
export default UserProfileService
