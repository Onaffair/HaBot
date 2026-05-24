import { app } from '@/core/app';
import {commands} from '@/core/command';
import {filters} from '@/core/filter';
import '@/commands';
import '@/filters';

/** 启动机器人：注册命令/过滤器 → 连接 WebSocket → 启动定时任务 */
export function startBot(): void {
  
  filters.forEach((filter) => app.registerFilter(filter));
  commands.forEach((cmd) => app.registerCommand(cmd));
  app.start();
  console.log('[Bot] HaBot is running...');
}
