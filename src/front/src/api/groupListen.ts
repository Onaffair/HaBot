import { get, post, put, del } from './request'
import type { GroupListen, GroupMemberNode, JoinedGroupNode } from './types'

// ============================================================================
// 监听群组 API — class + static 形式，参考 oneBot.ts
// ============================================================================

class GroupListenApi {
  /** 列表 */
  static list() {
    return get<GroupListen[]>('/group-listens')
  }

  /** bot 加入过的群（@ 对象级联的一级菜单） */
  static joinedGroups() {
    return get<JoinedGroupNode[]>('/group-listens/joined-groups')
  }

  /** 指定群的成员（级联二级菜单，refresh=true 时绕过后端成员缓存重拉） */
  static groupMembers(groupId: string, refresh = false) {
    return get<GroupMemberNode[]>(`/group-listens/joined-groups/${groupId}/members`, {
      refresh: refresh ? 1 : undefined,
    })
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
