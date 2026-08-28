import { Express, Request, Response } from 'express';
import { db } from '../../bot/utils/db';

export function createUserBlacklistRoutes(app: Express) {
  const prefix = '/api/user-blacklist';

  // 获取所有黑名单
  app.get(prefix, async (_req: Request, res: Response) => {
    try {
      const list = await db.userBlacklist?.findMany({
        orderBy: { createdAt: 'desc' }
      }) || [];
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 根据 QQ 号获取单个
  app.get(`${prefix}/:qq`, async (req: Request, res: Response) => {
    try {
      const record = await db.userBlacklist?.findUnique({
        where: { qq: req.params.qq as string }
      });
      if (!record) {
        return res.status(404).json({ success: false, message: '该用户不在黑名单中' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 添加黑名单
  app.post(prefix, async (req: Request, res: Response) => {
    try {
      const { qq, reason } = req.body;
      if (!qq) {
        return res.status(400).json({ success: false, message: 'qq 不能为空' });
      }
      const record = await db.userBlacklist?.create({
        data: { qq, reason }
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 更新黑名单原因
  app.put(`${prefix}/:qq`, async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const record = await db.userBlacklist?.update({
        where: { qq: req.params.qq as string },
        data: { reason }
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 移出黑名单
  app.delete(`${prefix}/:qq`, async (req: Request, res: Response) => {
    try {
      await db.userBlacklist?.delete({ where: { qq: req.params.qq as string } });
      res.json({ success: true, message: '移出成功' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
