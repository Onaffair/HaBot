// ============================================================================
// API 层统一入口：按资源域拆分为 class + static 方法（参考 oneBot.ts 结构）
// 视图层通过 `import { GroupListenApi, ... } from '@/api'` 使用；
// 若需扩展新资源，在 ./ 下新增 `<resource>.ts` 文件并在此聚合导出。
// ============================================================================

export * from './types'
export { default as request, get, post, put, patch, del } from './request'

export { default as GroupListenApi } from './groupListen'
export { default as UserBlacklistApi } from './userBlacklist'
export { default as ManagedResourceApi } from './managedResource'
export { default as CommandRuleApi } from './commandRule'
export { default as FileSystemApi, ResourceSettingApi } from './fileSystem'
export { default as CanvasApi } from './canvas'
export { default as BotControlApi } from './botControl'
export { default as SystemConfigApi } from './systemConfig'
