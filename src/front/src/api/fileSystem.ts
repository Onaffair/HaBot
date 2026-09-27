import { get, post, put, del } from './request'
import type { FsNode } from './types'

// ============================================================================
// 服务器目录浏览 & 默认管理目录 设置 API
// 文件上传/新建子目录属于对服务器文件系统的写操作，统一走 /filesystem 前缀
// ============================================================================

class FileSystemApi {
  /** 列出某路径下的子目录（用于树形懒加载） */
  static dirs(path: string) {
    return get<FsNode[]>('/filesystem/dirs', { path })
  }

  /** 列出某路径下的子目录与文件（混合），供资源选择树下钻到具体文件 */
  static entries(path: string) {
    return get<FsNode[]>('/filesystem/entries', { path })
  }

  /** 校验路径是否为有效目录 */
  static exists(path: string) {
    return get<boolean>('/filesystem/exists', { path })
  }

  /** 目录树初始候选根（Home / 磁盘） */
  static roots() {
    return get<FsNode[]>('/filesystem/roots')
  }

  /** 后端进程所在的项目根目录（资源选择树默认定位锚点） */
  static projectRoot() {
    return get<string>('/filesystem/project-root')
  }

  /** 默认管理目录节点（用于打开对话框时定位） */
  static defaultTree(path: string) {
    return get<FsNode | null>('/filesystem/default-tree', { path })
  }

  /** 在父目录下新建子目录 */
  static mkdir(path: string, name: string) {
    return post<{ path: string }>('/filesystem/mkdir', { path, name })
  }

  /** 上传资源文件到指定目录（多文件） */
  static upload(dirPath: string, files: File[]) {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    return post<{ files: string[] }>('/filesystem/upload', formData, {
      params: { dirPath },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  /** 删除资源文件或空目录（后端拒绝删除非空目录） */
  static remove(path: string) {
    return del<{ path: string }>(`/filesystem/delete?path=${encodeURIComponent(path)}`)
  }
}

/** 默认管理目录（资源设置） */
class ResourceSettingApi {
  static getDefaultDir() {
    return get<string | null>('/resource-settings/default-dir')
  }

  static setDefaultDir(path: string) {
    return put<string>('/resource-settings/default-dir', { path })
  }
}

export { ResourceSettingApi }
export default FileSystemApi
