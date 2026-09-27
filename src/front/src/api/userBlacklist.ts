import { get, post, put, del } from './request'
import type { UserBlacklist } from './types'

// ============================================================================
// 用户黑名单 API
// ============================================================================

class UserBlacklistApi {
  static list() {
    return get<UserBlacklist[]>('/user-blacklist')
  }

  static get(qq: string) {
    return get<UserBlacklist>(`/user-blacklist/${qq}`)
  }

  static create(params: { qq: string, reason?: string }) {
    return post<UserBlacklist>('/user-blacklist', params)
  }

  static update(qq: string, params: { reason: string }) {
    return put<UserBlacklist>(`/user-blacklist/${qq}`, params)
  }

  static delete(qq: string) {
    return del<null>(`/user-blacklist/${qq}`)
  }
}

export default UserBlacklistApi
