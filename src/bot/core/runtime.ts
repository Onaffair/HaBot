import fs from 'fs';
import path from 'path';
import { CommandFactory, DynamicCommandExt } from './command';
import { BeanFactory } from './bean';
import { MessageBuilder } from '@/utils/message';
import { createLogger } from '@/utils/logger';
import { managedResourceService, commandRuleService, groupListenService } from '@/services/db';
import type { ManagedResource } from '@/services/db/managedResource';
import type { CommandRule } from '@/services/db/commandRule';
import type { ResourceConfig } from '@/beans/resource';
import type { GroupConfig } from '@/beans/group';
import type { OB11GroupMember } from '@/interface/onebot';

const logger = createLogger('Runtime');

/**
 * Bot 运行态（Runtime，单例）。
 *
 * bot 与 backend 同进程运行时，后端在修改数据库后，直接 import 本实例即可把
 * 数据同步到 CommandFactory / BeanFactory 承载的运行态（命令注册、资源 folder、
 * 监听群 bean），无需中间通知服务。
 *
 * 覆盖数据：
 *  - 目录资源段 managed_resources（动态命令 + folder）
 *  - 触发规则 command_rules（动态命令）
 *  - 监听群组 group_listens（group bean）
 *  - 服务器文件系统变更（资源 children）
 */
export class Runtime {
  private static _instance: Runtime;
  private cmdFactory = CommandFactory.getInstance();
  private beanFactory = BeanFactory.getInstance();

  private static SOURCE_RESOURCE = 'managed-resource';
  private static SOURCE_COMMAND_RULE = 'command-rule';
  private static VALID_EXT_RE = /\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|amr)$/i;

  /** 已落地的资源段 id -> name（据 id 定位 folder 剔除项） */
  private resourceNameById = new Map<number, string>();

  private constructor() {}

  static getInstance(): Runtime {
    if (!Runtime._instance) Runtime._instance = new Runtime();
    return Runtime._instance;
  }

  // ======================================================================
  // 工具：路径 / 目录扫描
  // ======================================================================

  /** 解析目录绝对路径 */
  resolveFolderAbsPath(p: string): string {
    if (path.isAbsolute(p)) return path.resolve(p);
    const base = path.resolve(process.cwd(), process.env.RESOURCE_PATH || '');
    return path.resolve(base, p);
  }

  /** 递归扫描资源目录，返回其下所有合法资源文件绝对路径 */
  scanFolderChildren(folderPath: string): string[] {
    const abs = this.resolveFolderAbsPath(folderPath);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      logger.warn(`Resource folder not found: ${abs}`);
      return [];
    }
    const result: string[] = [];
    const walk = (dir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile() && Runtime.VALID_EXT_RE.test(e.name)) result.push(full);
      }
    };
    walk(abs);
    return result;
  }

  private buildFolderItem(resource: { name: string; path: string; keywords?: string[]; enabled?: boolean }) {
    return {
      name: resource.name,
      path: resource.path,
      keywords: resource.keywords || [],
      enabled: resource.enabled !== false,
      children: [] as string[],
    };
  }

  private isPathUnderResource(abs: string, resourcePath: string): boolean {
    const norm = (p: string) => path.resolve(p).toLowerCase();
    const absNorm = norm(abs);
    const root = norm(this.resolveFolderAbsPath(resourcePath));
    if (absNorm === root) return true;
    return absNorm.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
  }

  private readFolders(): NonNullable<ResourceConfig['folder']> {
    const cfg = this.beanFactory.getBeanValue<ResourceConfig>('resource') || { folder: [] };
    return cfg.folder || [];
  }

  private writeFolders(folders: NonNullable<ResourceConfig['folder']>) {
    const cfg = this.beanFactory.getBeanValue<ResourceConfig>('resource') || { folder: [] };
    this.beanFactory.setBeanValue('resource', { ...cfg, folder: folders });
  }

  private upsertFolderItem(resource: ManagedResource, scan: boolean): void {
    const folders = this.readFolders();
    const idx = folders.findIndex((f) => f.name === resource.name);
    const item = this.buildFolderItem(resource);
    if (scan) item.children = this.scanFolderChildren(resource.path);
    else if (idx >= 0 && folders[idx].children?.length) item.children = folders[idx].children;
    if (idx >= 0) folders[idx] = item;
    else folders.push(item);
    this.writeFolders(folders);
    this.resourceNameById.set(resource.id, resource.name);
  }

  private removeFolderItemByName(name: string): boolean {
    const folders = this.readFolders();
    const idx = folders.findIndex((f) => f.name === name);
    if (idx === -1) return false;
    folders.splice(idx, 1);
    this.writeFolders(folders);
    return true;
  }

  private removeFolderItemById(id: number): boolean {
    const name = this.resourceNameById.get(id);
    if (name) {
      this.resourceNameById.delete(id);
      return this.removeFolderItemByName(name);
    }
    return false;
  }

  // ======================================================================
  // 目录资源段 managed_resources
  // ======================================================================

  private registerResourceCommand(resource: ManagedResource): void {
    const keywords = (resource.keywords || []).filter((k) => k && k.trim());
    const syncKey = `${Runtime.SOURCE_RESOURCE}:${resource.id}`;
    if (keywords.length === 0) {
      this.cmdFactory.removeBySyncKey(syncKey);
      return;
    }
    const ext: DynamicCommandExt = {
      source: Runtime.SOURCE_RESOURCE,
      sourceId: resource.id,
      syncKey,
    };
    this.cmdFactory.registry({
      name: resource.name,
      description: resource.description || resource.name,
      ext,
      match: (session) => keywords.some((k) => session.textContent.includes(k)),
      handle: async () => {
        const builder = MessageBuilder.message().resource(resource.name)
        if (builder.isEmpty()) return
        logger.info(`[${resource.name}] Sending resource`)
        return builder.build()
      },
    });
  }

  private removeResourceCommand(id: number): boolean {
    return this.cmdFactory.removeBySyncKey(`${Runtime.SOURCE_RESOURCE}:${id}`);
  }

  /** 后端操作某资源段（新增/更新/启停）后调用：同步其命令与 folder */
  async upsertResource(id: number, enabled: boolean): Promise<void> {
    if (!enabled) {
      this.removeResourceCommand(id);
      this.removeFolderItemById(id);
      logger.info(`Resource removed from runtime: #${id}`);
      return;
    }
    const resource = await managedResourceService.findById(id);
    if (!resource) {
      logger.warn(`upsertResource: #${id} not found in db, skip`);
      return;
    }
    this.registerResourceCommand(resource);
    this.upsertFolderItem(resource, true);
    logger.info(`Resource applied to runtime: #${id} ${resource.name}`);
  }

  /** 以全部已启用资源段重建命令与 folder（启动 / 全量） */
  async applyResources(): Promise<void> {
    const resources = await managedResourceService.findEnabled();
    this.resourceNameById.clear();
    for (const c of this.cmdFactory.getCommand()) {
      if (c.ext?.source === Runtime.SOURCE_RESOURCE && c.ext?.syncKey) {
        this.cmdFactory.removeBySyncKey(c.ext.syncKey);
      }
    }
    const folders: NonNullable<ResourceConfig['folder']> = [];
    for (const r of resources) {
      this.registerResourceCommand(r);
      folders.push(this.buildFolderItem(r));
      this.resourceNameById.set(r.id, r.name);
    }
    this.writeFolders(folders);
    logger.info(`Resources applied: ${resources.length} enabled resource(s)`);
  }

  /** 服务器某目录/文件变更后，命中的资源段递归重扫 children */
  async rescanUnderPath(absPath: string): Promise<void> {
    const resources = await managedResourceService.findEnabled();
    const affected: string[] = [];
    for (const r of resources) {
      if (!this.isPathUnderResource(absPath, r.path)) continue;
      this.upsertFolderItem(r, true);
      affected.push(r.name);
    }
    logger.info(`rescanUnderPath: ${absPath} -> ${affected.length ? affected.join(', ') : 'no resource'}`);
  }

  // ======================================================================
  // 触发规则 command_rules
  // ======================================================================

  private matchRuleText(text: string, rule: CommandRule): boolean {
    const keywords = (rule.keywords || []).filter((k) => k && k.trim());
    if (keywords.length === 0) return false;
    switch (rule.matchType) {
      case 'exact':
        return keywords.some((k) => text === k);
      case 'chars':
        return keywords.some((k) => Array.from(k).every((ch) => text.includes(ch)));
      case 'contains':
      default:
        return keywords.some((k) => text.includes(k));
    }
  }

  private registerRuleCommand(rule: CommandRule): void {
    const syncKey = `${Runtime.SOURCE_COMMAND_RULE}:${rule.id}`;
    if (!rule.enabled || !rule.resourceName) {
      this.cmdFactory.removeBySyncKey(syncKey);
      return;
    }
    this.cmdFactory.registry({
      name: rule.name,
      description: rule.description || rule.name,
      priority: rule.priority,
      ext: { source: Runtime.SOURCE_COMMAND_RULE, sourceId: rule.id, syncKey },
      match: (session) => this.matchRuleText(session.textContent, rule),
      handle: async () => {
        // 变长路径：folder 名 + 可选 fileFilter；未命中时 builder 为空，提前 return
        const segments = [rule.resourceName, ...(rule.fileFilter ? [rule.fileFilter] : [])];
        const builder = MessageBuilder.message().resource(...segments);
        if (builder.isEmpty()) return;
        logger.info(`[${rule.name}] Sending resource from ${segments.join('/')}`);
        return builder.build();
      },
    });
  }

  private removeRuleCommand(id: number): boolean {
    return this.cmdFactory.removeBySyncKey(`${Runtime.SOURCE_COMMAND_RULE}:${id}`);
  }

  /** 后端操作某触发规则（新增/更新/启停）后调用：注册或移除其命令 */
  async upsertRule(id: number, enabled: boolean): Promise<void> {
    if (!enabled) {
      this.removeRuleCommand(id);
      logger.info(`Rule removed from runtime: #${id}`);
      return;
    }
    const rule = await commandRuleService.findById(id);
    if (!rule) {
      logger.warn(`upsertRule: #${id} not found in db, skip`);
      return;
    }
    this.registerRuleCommand(rule);
    logger.info(`Rule applied to runtime: #${id} ${rule.name}`);
  }

  /** 以全部已启用触发规则重建命令（启动 / 全量） */
  async applyRules(): Promise<void> {
    const rules = await commandRuleService.findEnabled();
    for (const c of this.cmdFactory.getCommand()) {
      if (c.ext?.source === Runtime.SOURCE_COMMAND_RULE && c.ext?.syncKey) {
        this.cmdFactory.removeBySyncKey(c.ext.syncKey);
      }
    }
    let count = 0;
    for (const rule of rules) {
      if (!rule.resourceName) continue;
      this.registerRuleCommand(rule);
      count++;
    }
    logger.info(`Rules applied: ${count} rule(s)`);
  }

  // ======================================================================
  // 监听群组 group_listens
  // ======================================================================

  /** 全量刷新 group bean 的监听群列表（保留既有群成员缓存）。后端改群组后调用。 */
  async refreshGroups(): Promise<void> {
    const groups = await groupListenService.findEnabled();
    const oldBean = this.beanFactory.getBeanValue<GroupConfig>('group') || { listen: [] };
    const memberCache = new Map<string, OB11GroupMember[]>();
    for (const item of oldBean.listen || []) {
      if (item.members?.length) memberCache.set(item.group_id, item.members);
    }
    const listen = groups.map((g) => ({
      group_id: g.groupId,
      members: memberCache.get(g.groupId) || ([] as OB11GroupMember[]),
    }));
    this.beanFactory.setBeanValue('group', { listen });
    logger.info(`Groups refreshed: ${listen.length} enabled group(s)`);
  }
}

/** 全局运行态实例（bot / backend 同进程共享） */
export const runtime = Runtime.getInstance();
