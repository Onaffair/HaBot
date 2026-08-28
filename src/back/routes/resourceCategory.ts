import { Express, Request, Response } from 'express';
import { db } from '../../bot/utils/db';

export function createResourceCategoryRoutes(app: Express) {
  const prefix = '/api/resource-categories';

  // 获取所有资源分类
  app.get(prefix, async (_req: Request, res: Response) => {
    try {
      const list = await db.resourceCategory?.findMany() || [];
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 根据 ID 获取单个
  app.get(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const record = await db.resourceCategory?.findUnique({
        where: { id: parseInt(req.params.id as string) }
      });
      if (!record) {
        return res.status(404).json({ success: false, message: '资源分类不存在' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 创建资源分类
  app.post(prefix, async (req: Request, res: Response) => {
    try {
      const { name, path, description } = req.body;
      if (!name || !path) {
        return res.status(400).json({ success: false, message: 'name 和 path 不能为空' });
      }
      const record = await db.resourceCategory?.create({
        data: { name, path, description }
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 更新资源分类
  app.put(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const { name, path, description } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (path !== undefined) data.path = path;
      if (description !== undefined) data.description = description;

      const record = await db.resourceCategory?.update({
        where: { id: parseInt(req.params.id as string) },
        data
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 删除资源分类
  app.delete(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      await db.resourceCategory?.delete({ where: { id: parseInt(req.params.id as string) } });
      res.json({ success: true, message: '删除成功' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
