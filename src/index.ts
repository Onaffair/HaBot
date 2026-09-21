import 'dotenv/config';
import { createLogger } from '@/utils/logger';
import DatabaseService from '@/utils/db';
import App from '@/core/app';
import { BeanFactory } from '@/core/bean';
import { runtime } from '@/core/runtime';
import { buildBackendApp, BACKEND_PORT } from './back';

const logger = createLogger('Bootstrap');

/**
 * 单进程启动入口：bot 与 backend 运行于同一进程。
 *
 * 架构：bot 的 CommandFactory / BeanFactory / Runtime 单例与后端共享同一内存，
 * 因此后端在操作数据库后可直接 import bot/core 的实例(runtime / command / bean)同步数据，
 * 无需跨进程通知。
 *
 * 顺序：
 *  1. 数据库初始化
 *  2. 加载 beans 并 initAllBean（resource/group 等按库填充运行态）
 *  3. 应用触发规则命令(command_rules)
 *  4. 启动后端 HTTP（管理界面/API）
 *  5. 加载命令 / 过滤器 / 定时任务（副作用注册到工厂）
 *  6. 启动 bot（连接 QQ）
 */
async function bootstrap() {
  /** db init */
  DatabaseService.getInstance();

  /** load Bean + 按库填充运行态(resource folder / 群监听等) */
  await import('@/beans');
  await BeanFactory.getInstance().initAllBean();

  /** 触发规则命令(command_rules) 全量落地 */
  await runtime.applyRules();

  /** 启动后端 HTTP */
  const app = buildBackendApp();
  const server = app.listen(Number(BACKEND_PORT), () => {
    logger.info(`Backend server running at http://localhost:${BACKEND_PORT}`);
  });

  /** 命令 / 过滤器 / 定时任务注册（副作用加载到 CommandFactory 等） */
  await Promise.all([
    import('@/services'),
    import('@/commands'),
    import('@/filters'),
    import('@/schedules'),
  ]);

  /** bot app 启动（连接 QQ） */
  const bot = App.getInstance();
  bot.start();

  // return { server };
}

bootstrap().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
