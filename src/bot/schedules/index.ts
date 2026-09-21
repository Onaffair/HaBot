import { ScheduleFactory } from '@/core/schedule'
import type { Schedule } from '@/core/schedule'

import { syncGroupMembersSchedule } from './refreshGroupMembers'
import { refreshResourcesSchedule } from './refreshResources'

/**
 * 定时任务显式注册表：新增任务先在实现文件导出定义，再在此列表登记。
 * registry 会立即执行一次 handle 并转入 setInterval（取代原目录自动扫描机制）。
 */
const schedules: Schedule[] = [
  syncGroupMembersSchedule,
  refreshResourcesSchedule,
]

const fac = ScheduleFactory.getInstance()
schedules.forEach(schedule => fac.registry(schedule))
