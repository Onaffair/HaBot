import fs from 'fs'
import path from 'path'
import config, { updateConfig } from '@config'
import { getGourpMembers } from '@/api'
import { ossService } from '@utils/OSS'
import { createLogger } from '@utils/logger'
import { getBGImage } from '@/api/common'

const logger = createLogger('Initializer')

export class Initializer {
  async init() {
    await this.initResources()
    await this.initGroupMembers()
    updateConfig({
      resource: config.resource,
      group: config.group,
      BG: config.BG
    })
  }

  async initResources() {
    // 解析资源配置
    const { resource } = config
    if (resource && resource.path && resource.folder) {
      const basePath = resource.path

      // 判断是 URL (OSS) 还是本地路径
      if (basePath.startsWith('http://') || basePath.startsWith('https://')) {
        await this.initOSSResources(basePath, resource.folder)
      } else {
        this.initLocalResources(basePath, resource.folder)
      }
    }

    await this.initBGImage()
  }

  private async initOSSResources(urlStr: string, folders: any[]) {
    logger.info(`Loading resources from OSS: ${urlStr}`)
    try {
      // 从 URL 中解析出 OSS 的 Root Prefix
      // 例如 https://bucket.endpoint/ZIP/ -> /ZIP/ -> ZIP/
      const urlObj = new URL(urlStr)
      const rootPrefix = urlObj.pathname.startsWith('/')
        ? urlObj.pathname.substring(1)
        : urlObj.pathname

      // 遍历配置的文件夹
      for (const folder of folders) {
        const subPath = folder.path || folder.name
        // 拼接完整的 OSS Prefix，使用 path.posix 确保使用 / 分隔符
        const dirPrefix = path.posix.join(rootPrefix, subPath)

        logger.info(`Fetching OSS files for ${folder.name} (Prefix: ${dirPrefix})`)
        const files = await ossService.getDirFiles(dirPrefix)

        const validFiles: string[] = []
        for (const fileUrl of files) {
          // 根据类型进行简单过滤
          // OSS URL 通常包含文件名，可以通过 URL 路径判断后缀
          const fileName = path.basename(new URL(fileUrl).pathname)

          if (folder.type === 'image') {
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
              validFiles.push(fileUrl)
            }
          } else if (folder.type === 'voice') {
            if (/\.(mp3|wav|ogg|amr)$/i.test(fileName)) {
              validFiles.push(fileUrl)
            }
          } else {
            validFiles.push(fileUrl)
          }
        }

        folder.children = validFiles
        logger.info(`Loaded ${validFiles.length} resources for ${folder.name} from OSS`)
      }

    } catch (e) {
      logger.error('Failed to parse OSS resource path:', e)
    }
  }

  private async initBGImage() {
    const reqList = []
    for (let i = 1; i <= 10; i++) {
      for (let j = 1; j < 2; j++) {
        const req = getBGImage({
          pid: i.toString(),
          pidli: j.toString(),
          pmod: 'ptl'
        })
        reqList.push(req)
      }
    }
    const res = await Promise.all(reqList) as any
    config.BG = res.reduce((pre, cur) => {
      pre.push(...cur.data.map(item => item?.img || ''))
      return pre
    }, [])
    logger.info(`Loaded ${config.BG.length} BG images`)
  }




  private initLocalResources(basePath: string, folders: any[]) {
    // 解析根路径：处理 @ 别名
    let resolvedBasePath = basePath
    if (resolvedBasePath.startsWith('@/')) {
      let relativePath = resolvedBasePath.replace('@/', '')
      if (relativePath === 'src/resource') {
        relativePath = 'src/bot/resource'
      }
      resolvedBasePath = path.join(process.cwd(), relativePath)
    } else {
      resolvedBasePath = path.resolve(process.cwd(), resolvedBasePath)
    }

    // 遍历配置的文件夹
    for (const folder of folders) {
      const subPath = folder.path || folder.name
      const folderPath = path.join(resolvedBasePath, subPath)

      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath)
        const validFiles: string[] = []

        for (const file of files) {
          const filePath = path.join(folderPath, file)
          // 根据类型进行简单过滤
          if (folder.type === 'image') {
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
              validFiles.push(filePath)
            }
          } else if (folder.type === 'voice') {
            if (/\.(mp3|wav|ogg|amr)$/i.test(file)) {
              validFiles.push(filePath)
            }
          } else {
            validFiles.push(filePath)
          }
        }

        folder.children = validFiles
        logger.info(`Loaded ${validFiles.length} resources for ${folder.name}`)

      } else {
        logger.warn(`Resource folder not found: ${folderPath}`)
      }
    }
  }




  async initGroupMembers() {
    const { group } = config
    const reqList: Promise<any>[] = []

    group.listen.forEach(item => {
      const res = getGourpMembers(item.group_id).then(res => {
        item.members = [...res.data]
      }).catch(err => {
        logger.error(`Failed to load members for group ${item.group_id}:`, err)
      })
      reqList.push(res)
    })

    await Promise.all(reqList)
    logger.info(`Loaded members for ${group.listen.length} groups`)
  }
}

export const initializer = new Initializer()
