import { get, post, put, del } from './request'
import type { GroupListen } from './types'

// ============================================================================
// 监听群组 API — class + static 形式，参考 oneBot.ts
// ============================================================================

class GroupListenApi {
  /** 列表 */
  static list() {
    return get<GroupListen[]>('/group-listens')
  }

  /** 单条查询 */
  static get(groupId: string) {
    return get<GroupListen>(`/group-listens/${groupId}`)
  }

  /** 新增 */
  static create(params: { groupId: string, enabled?: boolean }) {
    return post<GroupListen>('/group-listens', params)
  }

  /** 更新启用状态 */
  static update(groupId: string, params: { enabled: boolean }) {
    return put<GroupListen>(`/group-listens/${groupId}`, params)
  }

  /** 删除 */
  static delete(groupId: string) {
    return del<null>(`/group-listens/${groupId}`)
  }
}

export default GroupListenApi
