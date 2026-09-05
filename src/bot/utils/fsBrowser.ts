import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLogger } from '@utils/logger';

const logger = createLogger('FsBrowser');

export interface FsNode {
  /** 节点 key：目录使用完整绝对路径，供 el-tree 唯一标识 */
  key: string;
  label: string;
  path: string;
  isDir: boolean;
  /** 是否存在可继续下钻的子目录 */
  children?: FsNode[];
  leaf?: boolean;
}

/** 列出某个路径下的子目录（默认只返回目录，便于构建目录树）。 */
export function listDirectories(dirPath: string): FsNode[] {
  const abs = path.resolve(dirPath);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    return [];
  }
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e): FsNode => {
      const p = path.join(abs, e.name);
      return {
        key: p,
        label: e.name,
        path: p,
        isDir: true,
        // leaf=false：表示该目录下仍可能有子目录（尚未懒加载，由前端展开时请求）
        leaf: false,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));

  return dirs;
}

/** 列出某个路径下的文件与子目录（混合，用于预览资源内容）。 */
export function listEntries(dirPath: string): FsNode[] {
  const abs = path.resolve(dirPath);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    return [];
  }
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  return entries
    .map((e) => ({
      key: path.join(abs, e.name),
      label: e.name,
      path: path.join(abs, e.name),
      isDir: e.isDirectory(),
    }))
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.label.localeCompare(b.label, 'zh-CN');
    });
}

/** 返回可作为目录树初始根的候选路径（从已配置的默认目录开始）。 */
export function getRootCandidates(defaultDir?: string | null): string[] {
  const candidates: string[] = [];
  if (defaultDir && fs.existsSync(defaultDir) && fs.statSync(defaultDir).isDirectory()) {
    candidates.push(path.resolve(defaultDir));
  }
  candidates.push(os.homedir());
  return candidates;
}
