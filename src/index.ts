import 'dotenv/config';
import { createLogger } from '@/utils/logger';
import DatabaseService from '@/utils/db';
import App from '@/core/app';
import { BeanFactory } from '@/core/bean';
import { runtime } from '@/core/runtime';
import { configService } from '@/services/db';
import { refreshOneBotHttpConfig } from '@/api/common/oneBot';
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
 *  2. 系统配置初始化（DB 为准，首次以 .env 值作种子）
 *  3. 加载 beans 并 initAllBean（resource/group 等按库填充运行态）
 *  4. 应用触发规则命令(command_rules) + 画布(canvases)
 *  5. 启动后端 HTTP（管理界面/API）
 *  6. 加载命令 / 过滤器 / 定时任务（副作用注册到工厂）
 *  7. Bot 不自动启动，由外部经 POST /api/bot/start 控制生命周期
 */
async function bootstrap() {
  /** db init */
  DatabaseService.getInstance();

  /** 系统配置 init：必须在任何读取 configService 的业务模块加载前完成 */
  await configService.init();
  /** OneBot HTTP 实例在模块加载期已建立（彼时配置未就绪），此处按 DB 配置刷新一次 */
  refreshOneBotHttpConfig();

  /** load Bean + 按库填充运行态(resource folder / 群监听等) */
  await import('@/beans');
  await BeanFactory.getInstance().initAllBean();

  /** 触发规则命令(command_rules) 全量落地 */
  await runtime.applyRules();

  /** 启用画布(canvases) 全量加载到运行态，供规则引擎流转 */
  await runtime.applyCanvases();

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

  /** 预创建 Bot App 单例（注册 listeners），但不自动连接；启停交由 POST /api/bot/start|stop */
  App.getInstance();

  logger.info('Bootstrap complete — bot awaits external start via POST /api/bot/start');

  // return { server };
}

bootstrap().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
