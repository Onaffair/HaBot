import { Express, Request, Response } from 'express';
import { commandRuleService } from '../../bot/services/db';

export function createCommandRuleRoutes(app: Express) {
  const prefix = '/api/command-rules';

  // 获取所有触发规则
  app.get(prefix, async (_req: Request, res: Response) => {
    try {
      const list = await commandRuleService.findAll();
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 根据 ID 获取单个
  app.get(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const record = await commandRuleService.findById(parseInt(req.params.id as string));
      if (!record) {
        return res.status(404).json({ success: false, message: '触发规则不存在' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 创建触发规则
  app.post(prefix, async (req: Request, res: Response) => {
    try {
      const { name, description, enabled, matchType, keywords, resourceName, fileFilter, priority } = req.body;
      if (!name || !resourceName) {
        return res.status(400).json({ success: false, message: '命令名(name)与资源目录(resourceName)不能为空' });
      }
      const record = await commandRuleService.create({
        name,
        description,
        enabled,
        matchType,
        keywords: Array.isArray(keywords) ? keywords : [],
        resourceName,
        fileFilter,
        priority,
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 更新触发规则
  app.put(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const { name, description, enabled, matchType, keywords, resourceName, fileFilter, priority } = req.body;
      const record = await commandRuleService.update(parseInt(req.params.id as string), {
        name,
        description,
        enabled,
        matchType,
        keywords: keywords !== undefined && !Array.isArray(keywords) ? [] : keywords,
        resourceName,
        fileFilter,
        priority,
      });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 切换启用/禁用
  app.patch(`${prefix}/:id/toggle`, async (req: Request, res: Response) => {
    try {
      const enabled = !!req.body.enabled;
      const record = await commandRuleService.update(parseInt(req.params.id as string), { enabled });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 删除触发规则
  app.delete(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      await commandRuleService.delete(parseInt(req.params.id as string));
      res.json({ success: true, message: '删除成功' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
