import axios, { AxiosRequestConfig } from 'axios'
import { message } from 'ant-design-vue'
import type { ApiResponse } from './types'

// ============================================================================
// 后端通用响应格式: { success: boolean, data?: T, message?: string }
// 拦截器直接返回 data 字段（若存在），否则返回整体响应体；业务层按需断言类型。
// ============================================================================

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

request.interceptors.request.use((c) => c)

request.interceptors.response.use(
  (res) => {
    const body = res.data as ApiResponse<any>
    if (body && typeof body === 'object' && 'success' in body && body.success === false) {
      const msg = body.message || '请求失败'
      message.error(msg)
      return Promise.reject(new Error(msg))
    }
    return body as any
  },
  (err) => {
    const msg = err?.response?.data?.message || err?.message || '网络异常'
    message.error(msg)
    return Promise.reject(new Error(msg))
  },
)

// ============================================================================
// 统一 HTTP 方法封装：参考 oneBot.ts 的 get/post 双函数结构
// 由于后端采用 RESTful 语义（含 PUT/PATCH/DELETE），额外补齐对应 helper
// 所有 API 类通过这层方法访问后端，业务代码不直接接触 axios 实例
// ============================================================================

/** GET 请求：泛型 T 为后端 data 字段类型 */
export function get<T = any, P = any>(url: string, params?: P, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request.get<any, ApiResponse<T>>(url, { ...config, params })
}

/** POST 请求：泛型 D 为请求体类型 */
export function post<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<ApiResponse<T>> {
  return request.post<any, ApiResponse<T>>(url, data, config)
}

/** PUT 请求 */
export function put<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<ApiResponse<T>> {
  return request.put<any, ApiResponse<T>>(url, data, config)
}

/** PATCH 请求 */
export function patch<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<ApiResponse<T>> {
  return request.patch<any, ApiResponse<T>>(url, data, config)
}

/** DELETE 请求：`delete` 是关键字，导出别名为 del */
export function del<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request.delete<any, ApiResponse<T>>(url, config)
}

export default request
