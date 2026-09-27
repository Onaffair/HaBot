import type { AxiosRequestConfig } from 'axios'
import { configService } from '@/services/db/systemConfig'

// ============================================================================
// AI 全局代理
// ----------------------------------------------------------------------------
// 所有 AI 平台共用同一份代理设置（SystemConfig 的 AI_PROXY_HOST / AI_PROXY_PORT），
// 由 AIRequestManager 在发起请求时统一注入，平台实现不再各自维护代理配置。
// host 留空表示直连；配置修改后即时生效（每次请求重新读取）。
// ============================================================================

/** 构造全局代理请求配置；未配置 host 时返回空对象（直连） */
export function buildAIProxyConfig(): AxiosRequestConfig {
  const host = configService.get('AI_PROXY_HOST')
  if (!host) return {}
  return {
    proxy: {
      protocol: 'http',
      host,
      port: configService.getNumber('AI_PROXY_PORT', 7897),
    },
  }
}
