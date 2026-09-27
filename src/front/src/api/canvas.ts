import request from './request'
import type { CanvasPage, CanvasPayload, CanvasRecord } from './types'

// ============================================================================
// 流程画布 API
// ----------------------------------------------------------------------------
// 后端为 RESTful 风格：直接返回资源本身（列表为顶层 { list, total } 分页结构），
// 无 { success, data } 包装，因此不经 get/post helper 的 ApiResponse 泛型，
// 直接使用 request 实例并以第二泛型 R 标注真实响应类型，与 useTable 无缝对接。
// ============================================================================

class CanvasApi {
  /** 分页列表：返回值可直接被 useTable 解构 { list, total } */
  static list(params: { pageNum?: number; pageSize?: number; keyword?: string } = {}) {
    return request.get<any, CanvasPage>('/canvases', { params })
  }

  /** 获取单个画布完整数据 (nodes/edges/viewport) */
  static get(id: number) {
    return request.get<any, CanvasRecord>(`/canvases/${id}`)
  }

  /** 创建画布 (201 返回新建资源) */
  static create(payload: CanvasPayload & { name: string }) {
    return request.post<any, CanvasRecord>('/canvases', payload)
  }

  /** 更新画布（整体保存 nodes/edges 或仅元信息） */
  static update(id: number, payload: CanvasPayload) {
    return request.put<any, CanvasRecord>(`/canvases/${id}`, payload)
  }

  /** 仅切换启用状态 */
  static toggle(id: number, enabled: boolean) {
    return request.patch<any, CanvasRecord>(`/canvases/${id}/toggle`, { enabled })
  }

  /** 删除画布 (204 无响应体) */
  static delete(id: number) {
    return request.delete<any, void>(`/canvases/${id}`)
  }
}

export default CanvasApi
