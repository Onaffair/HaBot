import { db } from '@utils/db'

export interface CreateGroupInput {
  groupId: string
  enabled?: boolean
}

export interface UpdateGroupInput {
  enabled: boolean
}

class GroupListenService {
  /** 获取所有监听群组 */
  async findAll() {
    if (!db.groupListen) return []
    return db.groupListen.findMany()
  }

  /** 根据群号查找 */
  async findByGroupId(groupId: string) {
    if (!db.groupListen) return null
    return db.groupListen.findUnique({ where: { groupId } })
  }

  /** 获取所有已启用的群组 */
  async findEnabled() {
    if (!db.groupListen) return []
    return db.groupListen.findMany({ where: { enabled: true } })
  }

  /** 添加监听群组 */
  async create(data: CreateGroupInput) {
    if (!db.groupListen) return null
    return db.groupListen.create({
      data: { groupId: data.groupId, enabled: data.enabled ?? true }
    })
  }

  /** 更新群组监听状态 */
  async update(groupId: string, data: UpdateGroupInput) {
    if (!db.groupListen) return null
    return db.groupListen.update({
      where: { groupId },
      data
    })
  }

  /** 删除监听群组 */
  async delete(groupId: string) {
    if (!db.groupListen) return null
    return db.groupListen.delete({ where: { groupId } })
  }

  /** 判断是否在监听中 */
  async isListening(groupId: string): Promise<boolean> {
    if (!db.groupListen) return false
    const record = await db.groupListen.findUnique({ where: { groupId } })
    return record?.enabled ?? false
  }
}

export const groupListenService = new GroupListenService()
export default GroupListenService