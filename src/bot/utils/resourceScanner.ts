import path from 'path';
import { ossService } from './OSS';
import { createLogger } from './logger';

const logger = createLogger('ResourceScanner');

export interface ResourceFolder {
  name: string;
  path: string;
  type: string;
  children?: string[];
}

/**
 * 扫描 OSS 上的资源文件夹，返回填充了 children 的新数组（不修改原对象）。
 * @param folders   资源文件夹列表
 * @param ossBaseUrl  OSS 基础 URL，如 "https://bucket.endpoint/ZIP/"
 */
export async function scanOSSResourceFolders(
  folders: ResourceFolder[],
  ossBaseUrl: string,
): Promise<ResourceFolder[]> {
  // 解析 root prefix：https://bucket.endpoint/ZIP/ → ZIP/
  const urlObj = new URL(ossBaseUrl);
  const rootPrefix = urlObj.pathname.startsWith('/')
    ? urlObj.pathname.substring(1)
    : urlObj.pathname;

  const result: ResourceFolder[] = [];

  for (const folder of folders) {
    const subPath = folder.path || folder.name;
    const dirPrefix = path.posix.join(rootPrefix, subPath);

    logger.info(`Scanning OSS folder: ${folder.name} (prefix: ${dirPrefix})`);

    try {
      const files = await ossService.getDirFiles(dirPrefix);

      const validFiles = files.filter((fileUrl) => {
        const fileName = path.basename(new URL(fileUrl).pathname);
        if (folder.type === 'image') return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
        if (folder.type === 'voice') return /\.(mp3|wav|ogg|amr)$/i.test(fileName);
        return true;
      });

      result.push({ ...folder, children: validFiles });
      logger.info(`  ${folder.name}: ${validFiles.length} files`);
    } catch (e) {
      logger.error(`Failed to scan ${folder.name}:`, e);
      result.push({ ...folder }); // 保留原始数据
    }
  }

  return result;
}
