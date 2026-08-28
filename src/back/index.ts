import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createLogger } from '../bot/utils/logger';
import DatabaseService from '../bot/utils/db';
import { registerRoutes } from './routes';

const logger = createLogger('Backend');
const app = express();
const PORT = process.env.BACKEND_PORT || 3100;

// 初始化数据库
DatabaseService.getInstance();

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
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  logger.info(`Backend server running at http://localhost:${PORT}`);
  logger.info(`API 文档:`);
  logger.info(`  GET    /api/group-listens          - 监听群组列表`);
  logger.info(`  POST   /api/group-listens          - 添加监听群组`);
  logger.info(`  PUT    /api/group-listens/:groupId - 更新监听群组`);
  logger.info(`  DELETE /api/group-listens/:groupId - 删除监听群组`);
  logger.info(`  GET    /api/resource-categories     - 资源分类列表`);
  logger.info(`  POST   /api/resource-categories     - 创建资源分类`);
  logger.info(`  PUT    /api/resource-categories/:id - 更新资源分类`);
  logger.info(`  DELETE /api/resource-categories/:id - 删除资源分类`);
  logger.info(`  GET    /api/chat-memories           - 对话记忆列表`);
  logger.info(`  POST   /api/chat-memories           - 创建对话记忆`);
  logger.info(`  DELETE /api/chat-memories/:id       - 删除对话记忆`);
  logger.info(`  GET    /api/memory-summaries        - 对话摘要列表`);
  logger.info(`  DELETE /api/memory-summaries/:id    - 删除对话摘要`);
  logger.info(`  GET    /api/user-blacklist          - 黑名单列表`);
  logger.info(`  POST   /api/user-blacklist          - 添加黑名单`);
  logger.info(`  PUT    /api/user-blacklist/:qq      - 更新黑名单`);
  logger.info(`  DELETE /api/user-blacklist/:qq      - 移出黑名单`);
});
