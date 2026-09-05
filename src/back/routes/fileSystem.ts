import fs from 'fs';
import { Express, Request, Response } from 'express';
import os from 'os';
import { listDirectories, FsNode } from '../../bot/utils/fsBrowser';

/**
 * 服务器目录浏览接口，用于前端"选择本地目录"的树形控件懒加载。
 * 出于安全考虑仅暴露目录枚举能力，不提供文件内容读取。
 */
export function createFileSystemRoutes(app: Express) {
  const prefix = '/api/filesystem';

  // 列出指定路径下的子目录
  app.get(`${prefix}/dirs`, (req: Request, res: Response) => {
    try {
      const target = (req.query.path as string) || '';
      if (!target) {
        return res.status(400).json({ success: false, message: '缺少 path 参数' });
      }
      if (!fs.existsSync(target)) {
        return res.json({ success: true, data: [] });
      }
      const dirs = listDirectories(target);
      res.json({ success: true, data: dirs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 校验路径是否存在且为目录
  app.get(`${prefix}/exists`, (req: Request, res: Response) => {
    try {
      const target = (req.query.path as string) || '';
      const exists = !!target && fs.existsSync(target) && fs.statSync(target).isDirectory();
      res.json({ success: true, data: exists });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 获取目录树的初始候选根（默认管理目录 + 用户主目录）
  app.get(`${prefix}/roots`, (_req: Request, res: Response) => {
    try {
      const roots: FsNode[] = [
        { key: os.homedir(), label: 'Home', path: os.homedir(), isDir: true },
        ...(process.platform === 'win32'
          ? ['C:\\', 'D:\\', 'E:\\']
            .filter((p) => fs.existsSync(p))
            .map((p) => ({
              key: p,
              label: p.replace(/\\$/, '') + ' 盘',
              path: p,
              isDir: true,
            }))
          : []),
      ];
      res.json({ success: true, data: roots });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 在默认管理目录基础上探测：返回默认目录及其层级（若已配置）
  app.get(`${prefix}/default-tree`, (req: Request, res: Response) => {
    try {
      const defaultDir = (req.query.path as string) || '';
      if (!defaultDir || !fs.existsSync(defaultDir)) {
        return res.json({ success: true, data: null });
      }
      const node: FsNode = {
        key: defaultDir,
        label: defaultDir.split(/[\\/]/).pop() || defaultDir,
        path: defaultDir,
        isDir: true,
      };
      res.json({ success: true, data: node });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}
