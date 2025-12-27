import { app } from '@/core/app'
import commands from '@/commands'
import filters from '@/filters'

// 注册所有命令
commands.forEach(cmd => app.registerCommand(cmd))

// 注册所有过滤器
filters.forEach(filter => app.registerFilter(filter))

// 启动应用
app.start()

// 导出 app 实例供调试或其他用途
export default app
