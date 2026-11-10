import 'dotenv/config';
import { createLogger } from '@/utils/logger';
import { bootstrapAll } from './boot';

const logger = createLogger('Bootstrap');

/** 全量启动入口：bot + 管理后端（同进程）。仅启动 bot 请使用 src/botEntry.ts */
bootstrapAll().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
