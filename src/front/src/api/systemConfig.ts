import request from './request'
import type { SystemConfigListResult, SystemConfigSaveResult } from './types'

// ============================================================================
// 系统配置 API
// ----------------------------------------------------------------------------
// 后端为 RESTful 风格：直接返回资源本身，无 { success, data } 包装，
// 因此直接使用 request 实例并以第二泛型 R 标注真实响应类型（同 canvas.ts）。
// ============================================================================

class SystemConfigApi {
  /** 全量配置（按 category 分组） */
  static list() {
    return request.get<any, SystemConfigListResult>('/system-configs')
  }

  /** 批量保存：仅提交实际变化的项，返回变化清单与 Bot 重启结果 */
  static save(items: Array<{ key: string; value: string }>) {
    return request.put<any, SystemConfigSaveResult>('/system-configs', { items })
  }
}

export default SystemConfigApi
