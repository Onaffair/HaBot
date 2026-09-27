import { get, post, put, patch, del } from './request'
import type { ManagedResource, ManagedResourcePayload } from './types'

// ============================================================================
// 资源段（受管目录）API
// ============================================================================

class ManagedResourceApi {
  static list() {
    return get<ManagedResource[]>('/managed-resources')
  }

  static get(id: number) {
    return get<ManagedResource>(`/managed-resources/${id}`)
  }

  static create(params: ManagedResourcePayload) {
    return post<ManagedResource>('/managed-resources', params)
  }

  static update(id: number, params: Partial<ManagedResourcePayload>) {
    return put<ManagedResource>(`/managed-resources/${id}`, params)
  }

  /** 仅切换启用状态 */
  static toggle(id: number, enabled: boolean) {
    return patch<ManagedResource>(`/managed-resources/${id}/toggle`, { enabled })
  }

  static delete(id: number) {
    return del<null>(`/managed-resources/${id}`)
  }
}

export default ManagedResourceApi
