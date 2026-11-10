import { Express, Request, Response } from 'express';
import { aiPersonaService } from '../../bot/services/db';

// ============================================================================
// AI 人格提示词 REST 路由
// ----------------------------------------------------------------------------
// 将 aiChat 的系统人格提示词落库管理：增删改查 + 切换当前生效人格。
// 生效互斥（全表仅一条 isActive=true）由 aiPersonaService 保证。
// - GET    /api/ai-personas          200 全部人格
// - GET    /api/ai-personas/active   200 当前生效人格（无则 data=null）
// - GET    /api/ai-personas/:id      200 单条 / 404
// - POST   /api/ai-personas          200 新建人格 { name, prompt, isActive? }
// - PUT    /api/ai-personas/:id      200 更新 { name?, prompt? }
// - PATCH  /api/ai-personas/:id/active 200 设为生效人格
// - DELETE /api/ai-personas/:id      200 删除
// 注：静态路径 /active 必须先于 /:id 注册，否则会被动态段吞掉。
// ============================================================================

export function createAiPersonaRoutes(app: Express) {
  const prefix = '/api/ai-personas';

  // 获取全部人格
  app.get(prefix, async (_req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await aiPersonaService.findAll() });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 当前生效人格
  app.get(`${prefix}/active`, async (_req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await aiPersonaService.getActive() });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 单条查询
  app.get(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'id 必须为整数' });
      }
      const record = await aiPersonaService.findById(id);
      if (!record) {
        return res.status(404).json({ success: false, message: '人格不存在' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 新增人格
  app.post(prefix, async (req: Request, res: Response) => {
    try {
      const { name, prompt, isActive } = req.body;
      if (!name || !prompt) {
        return res.status(400).json({ success: false, message: 'name 和 prompt 不能为空' });
      }
      const record = await aiPersonaService.create({ name, prompt, isActive });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 更新人格名称/提示词
  app.put(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'id 必须为整数' });
      }
      const { name, prompt } = req.body;
      const record = await aiPersonaService.update(id, { name, prompt });
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 设为当前生效人格
  app.patch(`${prefix}/:id/active`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'id 必须为整数' });
      }
      const record = await aiPersonaService.setActive(id);
      if (!record) {
        return res.status(404).json({ success: false, message: '人格不存在' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 删除人格
  app.delete(`${prefix}/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'id 必须为整数' });
      }
      await aiPersonaService.remove(id);
      res.json({ success: true, message: '删除成功' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
