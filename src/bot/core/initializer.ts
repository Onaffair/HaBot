import fs from 'fs';
import path from 'path';
import config, { updateConfig } from '@config';
import { getGourpMembers } from '@/api';
import { createLogger } from '@utils/logger';
import { getBGImage } from '@/api/common';
import { scanOSSResourceFolders } from '@utils/resourceScanner';

const logger = createLogger('Initializer');

export class Initializer {
  async init() {
    await this.initResources();
    await this.initGroupMembers();
    updateConfig({
      resource: config.resource,
      group: config.group,
      BG: config.BG,
    });
  }

  async initResources() {
    const { resource } = config;
    if (!resource?.path || !resource?.folder) return;

    if (resource.path.startsWith('http://') || resource.path.startsWith('https://')) {
      const updated = await scanOSSResourceFolders(resource.folder, resource.path);
      config.resource.folder = updated;
    } else {
      this.initLocalResources(resource.path, resource.folder);
    }
    await this.initBGImage();
  }

  private initLocalResources(basePath: string, folders: any[]) {
    const resolvedBasePath = path.resolve(process.cwd(), 'src/resources/');
    
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

  private async initBGImage() {
    const reqList = [];
    for (let i = 1; i <= 10; i++) {
      for (let j = 1; j < 2; j++) {
        reqList.push(getBGImage({ pid: i.toString(), pidli: j.toString(), pmod: 'ptl' }));
      }
    }
    const res = (await Promise.all(reqList)) as any;
    config.BG = res.reduce((pre: string[], cur: any) => {
      pre.push(...cur.data.map((item: any) => item?.img || ''));
      return pre;
    }, []);
    logger.info(`Loaded ${config.BG.length} BG images`);
  }

  async initGroupMembers() {
    const { group } = config;
    const reqList: Promise<any>[] = [];

    group.listen.forEach((item) => {
      const res = getGourpMembers(item.group_id)
        .then((res) => {
          item.members = [...res];
        })
        .catch((err) => {
          logger.error(`Failed to load members for group ${item.group_id}:`, err);
        });
      reqList.push(res);
    });

    await Promise.all(reqList);
    logger.info(`Loaded members for ${group.listen.length} groups`);
  }
}

export const initializer = new Initializer();
