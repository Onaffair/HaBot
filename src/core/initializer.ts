import fs from 'fs'
import path from 'path'
import config from '@/bot.config'
import { getGourpMembers } from '@/api'

export class Initializer {
  async init() {
    await this.initResources()
    await this.initGroupMembers()
  }

  async initResources() {
    // 解析资源配置
    const { resource } = config
    if (resource && resource.path && resource.folder) {
      // 解析根路径：处理 @ 别名
      let basePath = resource.path
      if (basePath.startsWith('@/')) {
        basePath = path.join(process.cwd(), basePath.replace('@/', ''))
      } else {
        basePath = path.resolve(process.cwd(), basePath)
      }

      // 遍历配置的文件夹
      for (const folder of resource.folder) {
        // 使用配置中的 path 字段，如果不存在则回退到 name（虽然根据需求应该都有 path）
        const subPath = folder.path || folder.name
        const folderPath = path.join(basePath, subPath)
        
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
              // 其他类型暂时全部加载
              validFiles.push(filePath)
            }
          }
          
          // 将找到的资源放入 children
          folder.children = validFiles
          console.log(`[Initializer] Loaded ${validFiles.length} resources for ${folder.name}`)
          
        } else {
          console.warn(`[Initializer] Resource folder not found: ${folderPath}`)
        }
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
        console.error(`[Initializer] Failed to load members for group ${item.group_id}:`, err)
      })
      reqList.push(res)
    })
    
    await Promise.all(reqList)
    console.log(`[Initializer] Loaded members for ${group.listen.length} groups`)
  }
}

export const initializer = new Initializer()
