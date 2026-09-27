import { get, post, put, patch, del } from './request'
import type { CommandRule, CommandRulePayload } from './types'

// ============================================================================
// 触发规则 API
// ============================================================================

class CommandRuleApi {
  static list() {
    return get<CommandRule[]>('/command-rules')
  }

  static get(id: number) {
    return get<CommandRule>(`/command-rules/${id}`)
  }

  static create(params: CommandRulePayload) {
    return post<CommandRule>('/command-rules', params)
  }

  static update(id: number, params: Partial<CommandRulePayload>) {
    return put<CommandRule>(`/command-rules/${id}`, params)
  }

  static toggle(id: number, enabled: boolean) {
    return patch<CommandRule>(`/command-rules/${id}/toggle`, { enabled })
  }

  static delete(id: number) {
    return del<null>(`/command-rules/${id}`)
  }
}

export default CommandRuleApi
