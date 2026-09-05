import fs from 'fs';
import path from 'path';
import { BeanFactory } from '@/core/bean';
import { Schedule, ScheduleFactory } from "@/core/schedule";
import { createLogger } from '@utils/logger';
import type { ResourceConfig } from '@/beans/resource';

const factory = BeanFactory.getInstance()
const logger = createLogger('RefreshResources');

function loadLocalResources(folders: { name: string; path?: string; children?: string[] }[]) {
  const resolvedBasePath = path.resolve(process.cwd(), process.env.RESOURCE_PATH || '');
  
  for (const folder of folders) {
    // 目录管理：folder.path 为完整绝对路径；若为相对路径则兼容旧逻辑拼接到 RESOURCE_PATH 下
    const folderPath = folder.path && path.isAbsolute(folder.path)
      ? folder.path
      : path.join(resolvedBasePath, folder.path || folder.name);

    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      const files = fs.readdirSync(folderPath);
      const validFiles: string[] = [];
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        if (/\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|amr)$/i.test(file)) {
          validFiles.push(filePath);
        }
      }
      folder.children = validFiles;
      logger.info(`Loaded ${validFiles.length} resources for ${folder.name} (${folderPath})`);
    } else {
      logger.warn(`Resource folder not found: ${folderPath}`);
    }
  }
}

const refreshResourcesSchedule: Schedule = {
  name: '资源刷新',
  description: '定时扫描本地或 OSS 资源目录，更新可用资源列表',
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

const fac = ScheduleFactory.getInstance();
fac.registry(refreshResourcesSchedule);

export default refreshResourcesSchedule;
