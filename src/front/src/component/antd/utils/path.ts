// ============================================================================
// 表单嵌套路径工具
// BaseForm 需要把 'a.b.c' / ['a', 'b', 'c'] 两种写法的字段路径统一处理:
// - toPathArr  归一化为数组, 便于传给 antd FormItem 的 name
// - joinPath   将 FormItem.name 与 FormField.path 拼成完整路径
// - getByPath / setByPath  在响应式 model 上按路径读 / 写值, 支持数字索引
// ============================================================================
import type { FormPath } from '../types'

/**
 * 路径归一化: 字符串 'a.b.0' → ['a', 'b', 0]
 * 数字段自动转为 number, 保证对数组元素的读写走索引而非字符串键
 */
export function toPathArr(path?: FormPath): Array<string | number> {
  if (path === undefined || path === null || path === '') return []
  if (Array.isArray(path)) return path.slice()
  return String(path)
    .split('.')
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg))
}

/** 拼接两段路径, 空段自动跳过 */
export function joinPath(base?: FormPath, extra?: FormPath): Array<string | number> {
  const a = toPathArr(base)
  const b = toPathArr(extra)
  return b.length ? [...a, ...b] : a
}

/** 沿路径读取值; 中途遇到 null/undefined 直接返回 fallback */
export function getByPath<T = any>(source: any, path: FormPath, fallback?: T): T {
  const arr = toPathArr(path)
  if (!arr.length) return (source ?? fallback) as T
  let cur = source
  for (const seg of arr) {
    if (cur === null || cur === undefined) return fallback as T
    cur = cur[seg as any]
  }
  return (cur === undefined ? fallback : cur) as T
}

/**
 * 沿路径写入值; 缺失的中间层按下一段的类型自动补 [] 或 {}
 * 数组越界写入时按索引扩展 (JS 数组稀疏写入天然支持)
 */
export function setByPath(target: any, path: FormPath, value: any): void {
  const arr = toPathArr(path)
  if (!arr.length) return
  let cur = target
  for (let i = 0; i < arr.length - 1; i++) {
    const seg = arr[i]
    const nextSeg = arr[i + 1]
    if (cur[seg] === undefined || cur[seg] === null) {
      cur[seg] = typeof nextSeg === 'number' ? [] : {}
    }
    cur = cur[seg]
  }
  cur[arr[arr.length - 1]] = value
}

/** 深拷贝一个 plain object / array, 用于 getValues 与 setValues 的隔离 */
export function deepClone<T = any>(source: T): T {
  if (source === null || typeof source !== 'object') return source
  if (Array.isArray(source)) return source.map(deepClone) as unknown as T
  // Date / RegExp 等特殊对象直接返回原引用, 表单值场景罕用, 保持简单
  if (source instanceof Date || source instanceof RegExp) return source
  const out: Record<string, any> = {}
  for (const key of Object.keys(source as object)) {
    out[key] = deepClone((source as Record<string, any>)[key])
  }
  return out as T
}

/** 将 partial 深合并到 target (仅合并 plain object; 数组与基础类型整体覆盖) */
export function deepMerge(target: Record<string, any>, partial: Record<string, any>): void {
  if (!partial) return
  for (const key of Object.keys(partial)) {
    const next = partial[key]
    if (next && typeof next === 'object' && !Array.isArray(next) && !(next instanceof Date)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {}
      deepMerge(target[key], next)
    } else {
      target[key] = next
    }
  }
}
