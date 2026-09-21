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

export interface UserBlacklist {
  id: number
  qq: string
  reason?: string
  createdAt: string
}

export interface ManagedResource {
  id: number
  name: string
  path: string
  keywords: string[]
  description?: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface FsNode {
  key: string
  label: string
  path: string
  isDir: boolean
  children?: FsNode[]
  leaf?: boolean
}

export interface CommandRule {
  id: number
  name: string
  description?: string | null
  enabled: boolean
  matchType: 'exact' | 'contains' | 'chars'
  keywords: string[]
  resourceName: string
  fileFilter?: string | null
  priority: number
  createdAt: string
  updatedAt: string
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

// ==================== 文件夹管理：资源段 API ====================

export interface ManagedResourcePayload {
  name: string
  path: string
  keywords: string[]
  description?: string
  enabled?: boolean
}

export const managedResourceApi = {
  list: () => api.get<any, ApiResponse<ManagedResource[]>>('/managed-resources'),
  get: (id: number) => api.get<any, ApiResponse<ManagedResource>>(`/managed-resources/${id}`),
  create: (data: ManagedResourcePayload) =>
    api.post<any, ApiResponse<ManagedResource>>('/managed-resources', data),
  update: (id: number, data: Partial<ManagedResourcePayload>) =>
    api.put<any, ApiResponse<ManagedResource>>(`/managed-resources/${id}`, data),
  toggle: (id: number, enabled: boolean) =>
    api.patch<any, ApiResponse<ManagedResource>>(`/managed-resources/${id}/toggle`, { enabled }),
  delete: (id: number) =>
    api.delete<any, ApiResponse<null>>(`/managed-resources/${id}`)
}

// ==================== 默认管理目录 API ====================

export const resourceSettingApi = {
  getDefaultDir: () =>
    api.get<any, ApiResponse<string | null>>('/resource-settings/default-dir'),
  setDefaultDir: (path: string) =>
    api.put<any, ApiResponse<string>>('/resource-settings/default-dir', { path })
}

// ==================== 服务器目录浏览 API ====================

export const fileSystemApi = {
  /** 列出某路径下的子目录（用于树形懒加载） */
  dirs: (path: string) =>
    api.get<any, ApiResponse<FsNode[]>>('/filesystem/dirs', { params: { path } }),
  /** 校验路径是否为有效目录 */
  exists: (path: string) =>
    api.get<any, ApiResponse<boolean>>('/filesystem/exists', { params: { path } }),
  /** 目录树初始候选根（Home / 磁盘） */
  roots: () => api.get<any, ApiResponse<FsNode[]>>('/filesystem/roots'),
  /** 默认管理目录节点 */
  defaultTree: (path: string) =>
    api.get<any, ApiResponse<FsNode | null>>('/filesystem/default-tree', { params: { path } }),
  /** 在父目录下新建子目录 */
  mkdir: (path: string, name: string) =>
    api.post<any, ApiResponse<{ path: string }>>('/filesystem/mkdir', { path, name }),
  /** 上传资源文件到指定目录（多文件） */
  upload: (dirPath: string, files: File[]) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    return api.post<any, ApiResponse<{ files: string[] }>>('/filesystem/upload', formData, {
      params: { dirPath },
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// ==================== 触发规则 API ====================

export interface CommandRulePayload {
  name: string
  description?: string
  enabled?: boolean
  matchType: 'exact' | 'contains' | 'chars'
  keywords: string[]
  resourceName: string
  fileFilter?: string
  priority?: number
}

export const commandRuleApi = {
  list: () => api.get<any, ApiResponse<CommandRule[]>>('/command-rules'),
  get: (id: number) => api.get<any, ApiResponse<CommandRule>>(`/command-rules/${id}`),
  create: (data: CommandRulePayload) =>
    api.post<any, ApiResponse<CommandRule>>('/command-rules', data),
  update: (id: number, data: Partial<CommandRulePayload>) =>
    api.put<any, ApiResponse<CommandRule>>(`/command-rules/${id}`, data),
  toggle: (id: number, enabled: boolean) =>
    api.patch<any, ApiResponse<CommandRule>>(`/command-rules/${id}/toggle`, { enabled }),
  delete: (id: number) =>
    api.delete<any, ApiResponse<null>>(`/command-rules/${id}`)
}
