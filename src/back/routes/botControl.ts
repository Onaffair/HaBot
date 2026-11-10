import { Express, Request, Response } from 'express';
import App from '../../bot/core/app';
import { createLogger } from '../../bot/utils/logger';

// ============================================================================
// Bot 生命周期控制路由
// ----------------------------------------------------------------------------
// 进程启动时（统一入口 src/index.ts）Bot 会自动连接，本组接口提供运行中的
// 手动干预能力：POST /api/bot/stop 断开、POST /api/bot/start 重连、
// POST /api/bot/restart 以最新系统配置重建连接。
// GET /api/bot/status 查询当前运行态与「配置待生效」标记，供前端展示。
// ============================================================================

const logger = createLogger('BotControl');

export function createBotControlRoutes(app: Express) {
  const prefix = '/api/bot';

  // 查询 Bot 运行状态（configStale 表示连接参数已在配置页改动但尚未重启生效）
  app.get(`${prefix}/status`, (_req: Request, res: Response) => {
    const bot = App.getInstance();
    res.json({ success: true, data: { running: bot.isRunning, configStale: bot.isConfigStale } });
  });

  // 启动 Bot（建立 WS 连接）
  app.post(`${prefix}/start`, (_req: Request, res: Response) => {
    const bot = App.getInstance();
    if (bot.isRunning) {
      return res.json({ success: false, message: 'Bot 已在运行中' });
    }
    try {
      bot.start();
      logger.info('Bot started via API');
      res.json({ success: true, data: { running: true, configStale: bot.isConfigStale } });
    } catch (err: any) {
      logger.error(`Bot start failed: ${err?.message || err}`);
      res.status(500).json({ success: false, message: err?.message || 'Start failed' });
    }
  });

  // 停止 Bot（断开 WS 连接）
  app.post(`${prefix}/stop`, (_req: Request, res: Response) => {
    const bot = App.getInstance();
    if (!bot.isRunning) {
      return res.json({ success: false, message: 'Bot 未在运行' });
    }
    try {
      bot.stop();
      logger.info('Bot stopped via API');
      res.json({ success: true, data: { running: false } });
    } catch (err: any) {
      logger.error(`Bot stop failed: ${err?.message || err}`);
      res.status(500).json({ success: false, message: err?.message || 'Stop failed' });
    }
  });

  // 重启 Bot（以最新系统配置重建连接）
  app.post(`${prefix}/restart`, (_req: Request, res: Response) => {
    const bot = App.getInstance();
    try {
      bot.restart();
      logger.info('Bot restarted via API');
      res.json({ success: true, data: { running: true, configStale: bot.isConfigStale } });
    } catch (err: any) {
      logger.error(`Bot restart failed: ${err?.message || err}`);
      res.status(500).json({ success: false, message: err?.message || 'Restart failed' });
    }
  });
}
