import fs from 'fs';
import { Express, Request, Response } from 'express';
import { managedResourceService, resourceSettingService } from '../../bot/services/db';

export const DEFAULT_DIR_KEY = 'defaultDir';

export function createManagedResourceRoutes(app: Express) {
  const prefix = '/api/managed-resources';

  // ========== 资源段 CRUD ==========

  // 获取所有资源段
  app.get(prefix, async (_req: Request, res: Response) => {
    try {
      const list = await managedResourceService.findAll();
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 根据 ID 获取单个
  app.get(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const record = await managedResourceService.findById(parseInt(req.params.id as string));
      if (!record) {
        return res.status(404).json({ success: false, message: '资源段不存在' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 创建资源段
  app.post(prefix, async (req: Request, res: Response) => {
    try {
      const { name, path, keywords, description, enabled } = req.body;
      if (!name || !path) {
        return res.status(400).json({ success: false, message: '资源名称和目录路径不能为空' });
      }
      if (!fs.existsSync(path)) {
        return res.status(400).json({ success: false, message: `目录不存在: ${path}` });
      }
      const record = await managedResourceService.create({
        name,
        path,
        keywords: Array.isArray(keywords) ? keywords : [],
        description,
        enabled,
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 更新资源段
  app.put(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const { name, path, keywords, description, enabled } = req.body;
      if (path !== undefined && !fs.existsSync(path)) {
        return res.status(400).json({ success: false, message: `目录不存在: ${path}` });
      }
      const record = await managedResourceService.update(parseInt(req.params.id as string), {
        name,
        path,
        keywords: keywords !== undefined && !Array.isArray(keywords) ? [] : keywords,
        description,
        enabled,
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 切换启用/禁用（便捷接口，body: { enabled }）
  app.patch(`${prefix}/:id/toggle`, async (req: Request, res: Response) => {
    try {
      const enabled = !!req.body.enabled;
      const record = await managedResourceService.update(parseInt(req.params.id as string), {
        enabled,
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 删除资源段
  app.delete(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      await managedResourceService.delete(parseInt(req.params.id as string));
      res.json({ success: true, message: '删除成功' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== 默认管理目录 ==========

  // 获取默认管理目录
  app.get('/api/resource-settings/default-dir', async (_req: Request, res: Response) => {
    try {
      const value = await resourceSettingService.get(DEFAULT_DIR_KEY);
      res.json({ success: true, data: value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 设置默认管理目录
  app.put('/api/resource-settings/default-dir', async (req: Request, res: Response) => {
    try {
      const value = req.body.path as string;
      if (!value) {
        return res.status(400).json({ success: false, message: '目录路径不能为空' });
      }
      if (!fs.existsSync(value)) {
        return res.status(400).json({ success: false, message: `目录不存在: ${value}` });
      }
      const record = await resourceSettingService.set(DEFAULT_DIR_KEY, value);
      res.json({ success: true, data: value });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
