import { FilterFactory } from '@/core/filter'
import type { Filter } from '@/core/filter'

import { targetGroupFilter } from './targetSession'
// import { toMeFilter } from './toMe' // 艾特过滤器：暂不启用（沿用原黑名单意图），需要时取消注释并注册

/**
 * 过滤器显式注册表：消息需通过所有已注册过滤器才会进入命令层。
 * 未列出的文件不会被加载（取代原目录自动扫描机制）。
 */
const filters: Filter[] = [
  targetGroupFilter,
]

const fac = FilterFactory.getInstance()
filters.forEach(filter => fac.registry(filter))
