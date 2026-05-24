import fs from 'fs';
import path from 'path';
import config, { updateConfig } from '@config';
import { createLogger } from '@utils/logger';
import { scanOSSResourceFolders } from '@utils/resourceScanner';

const logger = createLogger('Scheduler');

const UPDATE_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour

/** 从本地 resources 目录读取资源文件并更新 config.resource.folder */
function loadLocal(folders: { name: string; path?: string; type: string; children?: string[] }[]) {
  const resolvedBasePath = path.resolve(process.cwd(), 'src/resources');

  for (const folder of folders) {
    const subPath = folder.path || folder.name;
    const folderPath = path.join(resolvedBasePath, subPath);

    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      const validFiles: string[] = [];

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        if (folder.type === 'image') {
          if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) validFiles.push(filePath);
        } else if (folder.type === 'voice') {
          if (/\.(mp3|wav|ogg|amr)$/i.test(file)) validFiles.push(filePath);
        } else {
          validFiles.push(filePath);
        }
      }
      folder.children = validFiles;
      logger.info(`Loaded ${validFiles.length} resources for ${folder.name}`);
    } else {
      logger.warn(`Resource folder not found: ${folderPath}`);
    }
  }
}

export async function refreshResources() {
  logger.info('Starting resource refresh...');
  try {
    const { resource } = config;
    if (!resource?.path?.startsWith('http')) {
      logger.info('load Local Resources');
      loadLocal(resource.folder);
      updateConfig({
        resource: { ...resource, folder: resource.folder },
      });
    } else {
      logger.info('load OSS Resources');
      const updated = await scanOSSResourceFolders(resource.folder, resource.path);
      updateConfig({
        resource: { ...resource, folder: updated },
      });
    }
    logger.info('Resource refresh completed.');
  } catch (error) {
    logger.error('Error refreshing resources:', error);
  }
}

export function startScheduler() {
  refreshResources();
  setInterval(refreshResources, UPDATE_INTERVAL);
  logger.info(`Scheduler started. Interval: ${UPDATE_INTERVAL}ms`);
}
