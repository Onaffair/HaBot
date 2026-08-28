import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.message || error.message || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

// ==================== 类型定义 ====================

export interface GroupListen {
  id: number
  groupId: string
  enabled: boolean
}

export interface ResourceCategory {
  id: number
  name: string
  path: string
  description?: string
}

export interface ChatMemory {
  id: number
  groupId: string
  userId: string
  role: string
  content: string
  raw?: string
  createdAt: string
}

export interface MemorySummary {
  id: number
  groupId: string
  summary: string
  sinceId: number
  createdAt: string
}

export interface UserBlacklist {
  id: number
  qq: string
  reason?: string
  createdAt: string
}

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

// ==================== 监听群组 API ====================

export const groupListenApi = {
  list: () => api.get<any, ApiResponse<GroupListen[]>>('/group-listens'),
  get: (groupId: string) => api.get<any, ApiResponse<GroupListen>>(`/group-listens/${groupId}`),
  create: (data: { groupId: string; enabled?: boolean }) =>
    api.post<any, ApiResponse<GroupListen>>('/group-listens', data),
  update: (groupId: string, data: { enabled: boolean }) =>
    api.put<any, ApiResponse<GroupListen>>(`/group-listens/${groupId}`, data),
  delete: (groupId: string) =>
    api.delete<any, ApiResponse<null>>(`/group-listens/${groupId}`)
}

// ==================== 资源分类 API ====================

export const resourceCategoryApi = {
  list: () => api.get<any, ApiResponse<ResourceCategory[]>>('/resource-categories'),
  get: (id: number) => api.get<any, ApiResponse<ResourceCategory>>(`/resource-categories/${id}`),
  create: (data: { name: string; path: string; description?: string }) =>
    api.post<any, ApiResponse<ResourceCategory>>('/resource-categories', data),
  update: (id: number, data: { name?: string; path?: string; description?: string }) =>
    api.put<any, ApiResponse<ResourceCategory>>(`/resource-categories/${id}`, data),
  delete: (id: number) =>
    api.delete<any, ApiResponse<null>>(`/resource-categories/${id}`)
}

// ==================== 对话记忆 API ====================

export const chatMemoryApi = {
  list: (params?: { page?: number; pageSize?: number; groupId?: string; userId?: string }) =>
    api.get<any, ApiResponse<PaginatedResult<ChatMemory>>>('/chat-memories', { params }),
  get: (id: number) => api.get<any, ApiResponse<ChatMemory>>(`/chat-memories/${id}`),
  create: (data: { groupId: string; userId: string; role: string; content: string; raw?: string }) =>
    api.post<any, ApiResponse<ChatMemory>>('/chat-memories', data),
  delete: (id: number) =>
    api.delete<any, ApiResponse<null>>(`/chat-memories/${id}`),
  clearAll: (groupId?: string) =>
    api.delete<any, ApiResponse<null>>('/chat-memories', { params: { groupId } })
}

// ==================== 对话摘要 API ====================

export const memorySummaryApi = {
  list: (params?: { page?: number; pageSize?: number; groupId?: string }) =>
    api.get<any, ApiResponse<PaginatedResult<MemorySummary>>>('/memory-summaries', { params }),
  get: (id: number) => api.get<any, ApiResponse<MemorySummary>>(`/memory-summaries/${id}`),
  create: (data: { groupId: string; summary: string; sinceId: number }) =>
    api.post<any, ApiResponse<MemorySummary>>('/memory-summaries', data),
  delete: (id: number) =>
    api.delete<any, ApiResponse<null>>(`/memory-summaries/${id}`),
  clearAll: (groupId?: string) =>
    api.delete<any, ApiResponse<null>>('/memory-summaries', { params: { groupId } })
}

// ==================== 用户黑名单 API ====================

export const userBlacklistApi = {
  list: () => api.get<any, ApiResponse<UserBlacklist[]>>('/user-blacklist'),
  get: (qq: string) => api.get<any, ApiResponse<UserBlacklist>>(`/user-blacklist/${qq}`),
  create: (data: { qq: string; reason?: string }) =>
    api.post<any, ApiResponse<UserBlacklist>>('/user-blacklist', data),
  update: (qq: string, data: { reason: string }) =>
    api.put<any, ApiResponse<UserBlacklist>>(`/user-blacklist/${qq}`, data),
  delete: (qq: string) =>
    api.delete<any, ApiResponse<null>>(`/user-blacklist/${qq}`)
}
