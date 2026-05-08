import { app } from '@/core/app'
import commands from '@/commands'
import filters from '@/filters'
import { OSSService } from '@utils/OSS'
import { startScheduler } from './scheduler'

// 注册所有命令
commands.forEach(cmd => app.registerCommand(cmd))

// 注册所有过滤器
filters.forEach(filter => app.registerFilter(filter))

// 启动机器人
app.start()

// 启动定时任务
startScheduler()

console.log('[Bot] HaBot is running...')


