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
  // logger.info(`API 文档:`);
  // logger.info(`  GET    /api/group-listens          - 监听群组列表`);
  // logger.info(`  POST   /api/group-listens          - 添加监听群组`);
  // logger.info(`  PUT    /api/group-listens/:groupId - 更新监听群组`);
  // logger.info(`  DELETE /api/group-listens/:groupId - 删除监听群组`);
  // logger.info(`  GET    /api/user-blacklist          - 黑名单列表`);
  // logger.info(`  POST   /api/user-blacklist          - 添加黑名单`);
  // logger.info(`  PUT    /api/user-blacklist/:qq      - 更新黑名单`);
  // logger.info(`  DELETE /api/user-blacklist/:qq      - 移出黑名单`);
  // logger.info(`  GET    /api/managed-resources       - 资源段列表`);
  // logger.info(`  POST   /api/managed-resources       - 创建资源段`);
  // logger.info(`  PUT    /api/managed-resources/:id   - 更新资源段`);
  // logger.info(`  DELETE /api/managed-resources/:id   - 删除资源段`);
  // logger.info(`  GET/PUT /api/resource-settings/default-dir - 默认管理目录`);
  // logger.info(`  GET    /api/filesystem/dirs         - 浏览服务器目录(子目录)`);
  // logger.info(`  GET    /api/filesystem/roots        - 目录树初始根`);
  // logger.info(`  GET    /api/command-rules           - 触发规则列表`);
  // logger.info(`  POST   /api/command-rules           - 创建触发规则`);
  // logger.info(`  PUT    /api/command-rules/:id       - 更新触发规则`);
  // logger.info(`  DELETE /api/command-rules/:id       - 删除触发规则`);
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
