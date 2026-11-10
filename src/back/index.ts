import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import { createLogger } from '../bot/utils/logger';
import DatabaseService from '../bot/utils/db';
import { configService } from '../bot/services/db';
import { registerRoutes } from './routes';

const logger = createLogger('Backend');
export const BACKEND_PORT = process.env.BACKEND_PORT || 3100;

/**
 * 构建并返回已配置(含路由/中间件)的后端 Express 应用（不在此处 listen）。
 * 统一入口(src/index.ts)与独立运行(src/back/index.ts)共用，保证 bot 与后端同进程时共享同一 app。
 */
export function buildBackendApp(): Express {
  const app = express();
  // 中间件
  app.use(cors());
  app.use(express.json());
  // 请求日志
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });
  // 注册路由
  registerRoutes(app);
  // 全局错误处理
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  });
  return app;
}

function printRoutes() {
  logger.info(`Backend server running at http://localhost:${BACKEND_PORT}`);
  logger.info(`API 文档:`);
  logger.info(`  CRUD   /api/group-listens    - 监听群组（含 joined-groups 与群成员，供 @ 选择）`);
  logger.info(`  CRUD   /api/user-blacklist   - 用户黑名单`);
  logger.info(`  CRUD   /api/canvases         - 流程画布（含 GET /:id/logs 流转日志）`);
  logger.info(`  GET    /api/filesystem/*     - 服务器目录浏览与资源文件读写`);
  logger.info(`  GET/PUT /api/system-configs  - 系统配置`);
  logger.info(`  POST   /api/bot-control/*    - Bot 启停`);
}

/**
 * 独立运行后端（不加载 bot），供后端单独调试/管理界面使用。
 */
export function startBackendOnly(): void {
  DatabaseService.getInstance();
  // 系统配置仍由本进程读写（/api/system-configs），先加载缓存再开服务
  void configService.init().then(() => {
    const app = buildBackendApp();
    app.listen(BACKEND_PORT, () => {
      printRoutes();
    });
  });
}

// 直接运行本文件(ts-node src/back/index.ts)时启动独立后端
if (require.main === module) {
  startBackendOnly();
}
