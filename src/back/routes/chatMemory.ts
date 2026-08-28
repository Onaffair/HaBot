import { Express, Request, Response } from 'express';
import { db } from '../../bot/utils/db';

export function createChatMemoryRoutes(app: Express) {
  const prefix = '/api/chat-memories';

  // 获取对话记忆列表（支持分页和筛选）
  app.get(prefix, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const groupId = req.query.groupId as string;
      const userId = req.query.userId as string;

      const where: any = {};
      if (groupId) where.groupId = groupId;
      if (userId) where.userId = userId;

      const [list, total] = await Promise.all([
        db.chatMemory?.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' }
        }) || [],
        db.chatMemory?.count({ where }) || 0
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
      const record = await db.chatMemory?.findUnique({
        where: { id: parseInt(req.params.id as string) }
      });
      if (!record) {
        return res.status(404).json({ success: false, message: '对话记忆不存在' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 创建对话记忆
  app.post(prefix, async (req: Request, res: Response) => {
    try {
      const { groupId, userId, role, content, raw } = req.body;
      if (!groupId || !userId || !role || !content) {
        return res.status(400).json({ success: false, message: 'groupId, userId, role, content 不能为空' });
      }
      const record = await db.chatMemory?.create({
        data: { groupId, userId, role, content, raw }
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 清空某个群组的对话记忆
  app.delete(prefix, async (req: Request, res: Response) => {
    try {
      const groupId = req.query.groupId as string;
      if (groupId) {
        await db.chatMemory?.deleteMany({ where: { groupId } });
        res.json({ success: true, message: `已清空群组 ${groupId} 的对话记忆` });
      } else {
        await db.chatMemory?.deleteMany({});
        res.json({ success: true, message: '已清空所有对话记忆' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 删除单条对话记忆
  app.delete(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      await db.chatMemory?.delete({ where: { id: parseInt(req.params.id as string) } });
      res.json({ success: true, message: '删除成功' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
