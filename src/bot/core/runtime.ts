import { BeanFactory } from './bean';
import { createLogger } from '@/utils/logger';
import { groupListenService, canvasService } from '@/services/db';
import type { Canvas } from '@/services/db/canvas';
import type { GroupConfig } from '@/beans/group';
import type { OB11GroupMember } from '@/interface/onebot';

const logger = createLogger('Runtime');

/**
 * Bot 运行态（Runtime，单例）。
 *
 * bot 与 backend 同进程运行时，后端在修改数据库后，直接 import 本实例即可把
 * 数据同步到运行态（规则引擎画布缓存、监听群 bean），无需中间通知服务。
 *
 * 覆盖数据：
 *  - 流程画布 canvases（规则引擎唯一的数据源，「关键词/正则 → 发送资源」等
 *    配置化行为全部改由画布表达，原目录管理与触发规则模块已移除）
 *  - 监听群组 group_listens（group bean）
 *
 * 资源本身不再需要运行态缓存：消息节点与命令直接按文件系统路径解析资源
 * （见 utils/resourcePath），文件系统改动即时生效。
 */
export class Runtime {
  private static _instance: Runtime;
  private beanFactory = BeanFactory.getInstance();

  /**
   * 已启用的画布缓存，供规则引擎流转时直接读取，避免每条消息查库。
   * 后端增删改/启停画布后经 upsertCanvas 精准同步，启动时经 applyCanvases 全量加载。
   */
  private canvases: Canvas[] = [];

  private constructor() {}

  static getInstance(): Runtime {
    if (!Runtime._instance) Runtime._instance = new Runtime();
    return Runtime._instance;
  }

  // ======================================================================
  // 流程画布 canvases（规则引擎数据源）
  // ======================================================================

  /** 后端操作某画布（新增/更新/启停）后调用：按 id 精准同步启用画布缓存 */
  async upsertCanvas(id: number, enabled: boolean): Promise<void> {
    const idx = this.canvases.findIndex((c) => c.id === id);
    if (!enabled) {
      if (idx >= 0) this.canvases.splice(idx, 1);
      logger.info(`Canvas removed from runtime: #${id}`);
      return;
    }
    const canvas = await canvasService.findById(id);
    if (!canvas) {
      logger.warn(`upsertCanvas: #${id} not found in db, skip`);
      return;
    }
    if (idx >= 0) this.canvases[idx] = canvas;
    else this.canvases.push(canvas);
    logger.info(`Canvas applied to runtime: #${id} ${canvas.name}`);
  }

  /** 以全部已启用画布重建缓存（启动 / 全量刷新） */
  async applyCanvases(): Promise<void> {
    const canvases = await canvasService.findEnabled();
    this.canvases = canvases;
    logger.info(`Canvases applied: ${canvases.length} enabled canvas(es)`);
  }

  /** 供规则引擎读取当前启用画布（返回引用，引擎只读不修改） */
  getCanvases(): Canvas[] {
    return this.canvases;
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
