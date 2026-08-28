import { Express, Request, Response } from 'express';
import { db } from '../../bot/utils/db';

export function createMemorySummaryRoutes(app: Express) {
  const prefix = '/api/memory-summaries';

  // 获取对话摘要列表（支持分页和筛选）
  app.get(prefix, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const groupId = req.query.groupId as string;

      const where: any = {};
      if (groupId) where.groupId = groupId;

      const [list, total] = await Promise.all([
        db.memorySummary?.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' }
        }) || [],
        db.memorySummary?.count({ where }) || 0
      ]);

      res.json({
        success: true,
        data: { list, total, page, pageSize }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 根据 ID 获取单个
  app.get(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const record = await db.memorySummary?.findUnique({
        where: { id: parseInt(req.params.id as string) }
      });
      if (!record) {
        return res.status(404).json({ success: false, message: '对话摘要不存在' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 创建对话摘要
  app.post(prefix, async (req: Request, res: Response) => {
    try {
      const { groupId, summary, sinceId } = req.body;
      if (!groupId || !summary || sinceId === undefined) {
        return res.status(400).json({ success: false, message: 'groupId, summary, sinceId 不能为空' });
      }
      const record = await db.memorySummary?.create({
        data: { groupId, summary, sinceId: parseInt(sinceId) }
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 删除对话摘要
  app.delete(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      await db.memorySummary?.delete({ where: { id: parseInt(req.params.id as string) } });
      res.json({ success: true, message: '删除成功' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 清空某个群组的摘要
  app.delete(prefix, async (req: Request, res: Response) => {
    try {
      const groupId = req.query.groupId as string;
      if (groupId) {
        await db.memorySummary?.deleteMany({ where: { groupId } });
        res.json({ success: true, message: `已清空群组 ${groupId} 的对话摘要` });
      } else {
        await db.memorySummary?.deleteMany({});
        res.json({ success: true, message: '已清空所有对话摘要' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
