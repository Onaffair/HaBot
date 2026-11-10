import { createLogger } from '@/utils/logger';
import DatabaseService from '@/utils/db';
import App from '@/core/app';
import { BeanFactory } from '@/core/bean';
import { runtime } from '@/core/runtime';
import { configService } from '@/services/db';
import { refreshOneBotHttpConfig } from '@/api/common/oneBot';
import { buildBackendApp, BACKEND_PORT } from './back';

const logger = createLogger('Bootstrap');

// ============================================================================
// 启动编排
// ----------------------------------------------------------------------------
// 两种入口共用同一份初始化逻辑：
//  - bootstrapBot  仅 bot（npm run dev），不监听管理后端端口
//  - bootstrapAll  bot + 管理后端同进程（npm run dev:all / 生产 index 入口）
// 后端路由直接依赖 bot/core 的单例（App 启停、runtime 画布缓存、command 等），
// 两者共享同一内存才能即时同步，因此 dev:all 不能把 bot 与后端拆成两个进程。
// ============================================================================

/**
 * bot 运行所需的共享初始化：数据库、系统配置、beans、画布缓存与扩展点注册。
 * 只做准备，不建立 WS 连接、不监听端口。
 */
async function prepare(): Promise<void> {
  /** db init */
  DatabaseService.getInstance();

  /** 系统配置 init：必须在任何读取 configService 的业务模块加载前完成 */
  await configService.init();
  /** OneBot HTTP 实例在模块加载期已建立（彼时配置未就绪），此处按 DB 配置刷新一次 */
  refreshOneBotHttpConfig();

  /** load Bean + 按库填充运行态(群监听等) */
  await import('@/beans');
  await BeanFactory.getInstance().initAllBean();

  /** 启用画布(canvases) 全量加载到运行态，供规则引擎流转 */
  await runtime.applyCanvases();

  /** 命令 / 过滤器 / 定时任务注册（副作用加载到 CommandFactory 等） */
  await Promise.all([
    import('@/services'),
    import('@/commands'),
    import('@/filters'),
    import('@/schedules'),
  ]);
}

/** 预创建 Bot App 单例（注册 listeners）并自动启动连接，无需前端手动开启 */
function startBot(): void {
  const bot = App.getInstance();
  try {
    bot.start();
    logger.info('Bot auto-started on bootstrap');
  } catch (err: any) {
    logger.error(`Bot auto-start failed: ${err?.message || err} — 可稍后经 POST /api/bot/start 手动启动`);
  }
}

/**
 * 只启动 bot：初始化共享运行态并建立 WS 连接，不启动管理后端。
 * 供 npm run dev 使用，适合只调试 QQ 机器人、不需要管理界面的场景。
 */
export async function bootstrapBot(): Promise<void> {
  await prepare();
  startBot();
  logger.info('Bot bootstrap complete');
}

/**
 * 全量启动：bot 与管理后端运行于同一进程。
 *
 * 后端在操作数据库后可直接引用 bot 的单例同步运行态，管理后台的
 * Bot 启停、画布编辑等接口依赖这份共享实例。
 * 供 npm run dev:all 使用（前端 dev server 由 concurrently 另行拉起）。
 */
export async function bootstrapAll(): Promise<void> {
  await prepare();

  /** 启动后端 HTTP */
  const app = buildBackendApp();
  app.listen(Number(BACKEND_PORT), () => {
    logger.info(`Backend server running at http://localhost:${BACKEND_PORT}`);
  });

  startBot();
  logger.info('Bootstrap complete');
}
