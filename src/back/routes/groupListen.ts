import { Express, Request, Response } from 'express';
import { db } from '../../bot/utils/db';
import { runtime } from '../../bot/core/runtime';
import { groupMemberService } from '../../bot/utils/groupMembers';

export function createGroupListenRoutes(app: Express) {
  const prefix = '/api/group-listens';

  // 获取所有监听群组
  app.get(prefix, async (_req: Request, res: Response) => {
    try {
      const list = await db.groupListen?.findMany() || [];
      res.json({ success: true, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // bot 加入过的群（画布 @ 对象级联的一级菜单）
  // 静态路径必须先于 `/:groupId` 注册，否则会被动态段吞掉
  app.get(`${prefix}/joined-groups`, async (_req: Request, res: Response) => {
    try {
      res.json({ success: true, data: await groupMemberService.listJoinedGroups() });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 指定群的成员（级联二级菜单，展开时才拉）；refresh=1 绕过后端成员缓存
  app.get(`${prefix}/joined-groups/:groupId/members`, async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId as string;
      const refresh = ['1', 'true'].includes(String(req.query.refresh ?? ''));
      res.json({ success: true, data: await groupMemberService.listMembers(groupId, refresh) });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 根据 groupId 获取单个
  app.get(`${prefix}/:groupId`, async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId as string;
      const record = await db.groupListen?.findUnique({
        where: { groupId }
      });
      if (!record) {
        return res.status(404).json({ success: false, message: '群组不存在' });
      }
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 创建监听群组
  app.post(prefix, async (req: Request, res: Response) => {
    try {
      const { groupId, enabled } = req.body;
      if (!groupId) {
        return res.status(400).json({ success: false, message: 'groupId 不能为空' });
      }
      const record = await db.groupListen?.create({
        data: { groupId, enabled: enabled ?? true }
      });
      void runtime.refreshGroups();
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 更新监听群组
  app.put(`${prefix}/:groupId`, async (req: Request, res: Response) => {
    try {
      const { enabled } = req.body;
      const record = await db.groupListen?.update({
        where: { groupId: req.params.groupId as string },
        data: { enabled }
      });
      void runtime.refreshGroups();
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 删除监听群组
  app.delete(`${prefix}/:groupId`, async (req: Request, res: Response) => {
    try {
      await db.groupListen?.delete({ where: { groupId: req.params.groupId as string } });
      void runtime.refreshGroups();
      res.json({ success: true, message: '删除成功' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
