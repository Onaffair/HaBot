import { BeanFactory } from '@/core/bean';
import { Schedule } from "@/core/schedule";
import { createLogger } from '@utils/logger';
import { runtime } from '@/core/runtime';
import type { ResourceConfig } from '@/beans/resource';

const factory = BeanFactory.getInstance()
const logger = createLogger('RefreshResources');

/**
 * 扫描各资源目录并填充其 children。
 * 目录扫描规则统一收敛到 core/runtime，避免与后端直调同步的规则漂移。
 */
function loadLocalResources(folders: { name: string; path?: string; children?: string[] }[]) {
  for (const folder of folders) {
    if (!folder.path) {
      logger.warn(`Resource folder without path skipped: ${folder.name}`);
      continue;
    }
    const files = runtime.scanFolderChildren(folder.path);
    folder.children = files;
    logger.info(`Loaded ${files.length} resources for ${folder.name} (${runtime.resolveFolderAbsPath(folder.path)})`);
  }
}

export const refreshResourcesSchedule: Schedule = {
  name: '资源刷新',
  description: '定时扫描本地资源目录，更新可用资源列表',
  delay: 12 * 60 * 60 * 1000, // 1 小时
  handle: async () => {
    logger.info('Starting resource refresh...');
    try {
      const resource = factory.getBeanValue<ResourceConfig>('resource');
      if (!resource?.folder) {
        logger.warn('No resource folders configured');
        return;
      }
      logger.info('Loading local resources...');
      loadLocalResources(resource.folder);
      factory.setBeanValue('resource', { ...resource, folder: resource.folder });
      logger.info('Resource refresh completed.');
    } catch (error) {
      logger.error('Error refreshing resources:', error);
    }
  },
};
