import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Express, Request, Response } from 'express';
import os from 'os';
import { listDirectories, listEntries, FsNode } from '../../bot/utils/fsBrowser';
import { runtime } from '../../bot/core/runtime';

/**
 * 服务器目录浏览 / 目录与资源文件管理接口。
 * 出于安全考虑默认仅暴露目录枚举，新增目录、上传文件等写操作需落点到存在的目录内。
 */
export function createFileSystemRoutes(app: Express) {
  const prefix = '/api/filesystem';

  // ========== 读取 ==========

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

  // 列出指定路径下的子目录与文件 (混合)，供资源选择树懒加载下钻到具体文件。
  // 目录 leaf=false 可继续展开；文件 leaf=true 作为可选叶子。
  app.get(`${prefix}/entries`, (req: Request, res: Response) => {
    try {
      const target = (req.query.path as string) || '';
      if (!target) {
        return res.status(400).json({ success: false, message: '缺少 path 参数' });
      }
      if (!fs.existsSync(target)) {
        return res.json({ success: true, data: [] });
      }
      const nodes = listEntries(target).map((n) => ({
        ...n,
        leaf: !n.isDir,
      }));
      res.json({ success: true, data: nodes });
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

  // 获取后端进程所在的项目根目录（作为资源选择树的默认定位锚点）
  app.get(`${prefix}/project-root`, (_req: Request, res: Response) => {
    try {
      res.json({ success: true, data: process.cwd() });
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

  // ========== 写入：新建目录 ==========

  /**
   * 在目标父目录下创建子目录。
   * body: { path: 父目录绝对路径, name: 新目录名 }
   */
  app.post(`${prefix}/mkdir`, (req: Request, res: Response) => {
    try {
      const parent = (req.body.path as string) || '';
      const name = ((req.body.name as string) || '').trim();
      if (!parent || !name) {
        return res.status(400).json({ success: false, message: '父目录路径与目录名不能为空' });
      }
      if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
        return res.status(400).json({ success: false, message: `父目录不存在: ${parent}` });
      }
      const safeName = sanitizeEntryName(name);
      const newDir = path.join(parent, safeName);
      if (fs.existsSync(newDir)) {
        return res.status(400).json({ success: false, message: `目录已存在: ${newDir}` });
      }
      fs.mkdirSync(newDir, { recursive: false });
      // 后端直接操作运行态：命中某资源目录则重扫其 children
      void runtime.rescanUnderPath(newDir);
      res.json({ success: true, data: { path: newDir } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== 写入：上传资源文件 ==========

  // 动态目标目录的磁盘存储：目标目录取自 URL query dirPath（请求开始即存在，顺序可靠）
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, _file, cb) => {
        try {
          const dir = decodeURIComponent((req.query.dirPath as string) || '');
          if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            cb(new Error(`目标目录不存在或不是目录: ${dir || '(empty)'}`), '');
            return;
          }
          cb(null, dir);
        } catch (e: any) {
          cb(e, '');
        }
      },
      filename: (_req, file, cb) => {
        cb(null, sanitizeEntryName(file.originalname));
      },
    }),
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB 上限
  });

  /**
   * 上传本机图片/音频/视频资源文件到指定目录。
   * query: dirPath=目标目录绝对路径；formData: files(可多个)。
   */
  app.post(`${prefix}/upload`, upload.array('files', 20), (req: Request, res: Response) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        return res.status(400).json({ success: false, message: '未接收到任何文件' });
      }
      const uploaded = files.map((f) => f.path);
      // 后端直接操作运行态：把新文件纳入命中的资源目录 children
      for (const filePath of uploaded) {
        void runtime.rescanUnderPath(filePath);
      }
      res.json({ success: true, data: { files: uploaded } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== 写入：删除资源文件 / 空目录 ==========

  /**
   * 删除资源文件或空目录，供画布等资源选择树内顺手清理素材。
   * query: path=待删除的绝对路径。
   * 安全约束：只允许删除文件与「空目录」，非空目录一律拒绝，避免递归误删整片素材库。
   */
  app.delete(`${prefix}/delete`, async (req: Request, res: Response) => {
    try {
      const target = decodeURIComponent((req.query.path as string) || '');
      if (!target) {
        return res.status(400).json({ success: false, message: '缺少 path 参数' });
      }
      if (!fs.existsSync(target)) {
        return res.status(404).json({ success: false, message: `路径不存在: ${target}` });
      }
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        if (fs.readdirSync(target).length > 0) {
          return res.status(400).json({ success: false, message: '目录非空，请先清空其中的资源再删除' });
        }
        fs.rmdirSync(target);
      } else {
        fs.unlinkSync(target);
      }
      // 以父目录为重扫落点：删除后该目录下 children 需要失效
      await runtime.rescanUnderPath(path.dirname(target));
      res.json({ success: true, data: { path: target } });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}

/** 清理文件名/目录名：去掉路径分隔符与穿越片段，仅保留基础名称 */
function sanitizeEntryName(name: string): string {
  const cleaned = name.replace(/[/\\]/g, '_').replace(/\.\.+/g, '_').trim();
  return cleaned || 'untitled';
}
