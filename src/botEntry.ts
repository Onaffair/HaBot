import 'dotenv/config';
import { createLogger } from '@/utils/logger';
import { bootstrapBot } from './boot';

const logger = createLogger('Bootstrap');

/** 仅启动 bot 的入口（npm run dev）：不监听管理后端端口 */
bootstrapBot().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
