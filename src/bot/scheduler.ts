import config, { updateConfig } from '../bot.config'
import { OSSService } from '../utils/OSS'
import { createLogger } from '../utils/logger'

const logger = createLogger('Scheduler')
const oss = new OSSService()

const UPDATE_INTERVAL = 1 * 60 * 60 * 1000 // 12 hours

export async function refreshResources() {
  logger.info('Starting resource refresh...')
  
  try {
    const folders = config.resource.folder
    const newFolders = []
    
    // Base URL for OSS resources
    // Extract from config.resource.path or hardcode based on known structure
    // config.resource.path is "https://onaffair.oss-cn-hangzhou.aliyuncs.com/ZIP/"
    // We can parse the domain from it
    let baseUrl = config.resource.path
    if (baseUrl.endsWith('ZIP/')) {
        baseUrl = baseUrl.slice(0, -4) // Remove ZIP/ suffix to get domain root or keep it if we append relative paths?
    }
    // Actually, config.resource.path is "https://onaffair.oss-cn-hangzhou.aliyuncs.com/ZIP/"
    // OSS keys are like "ZIP/cat/file.jpg"
    // So full URL is "https://onaffair.oss-cn-hangzhou.aliyuncs.com/" + key
    
    // Let's hardcode the domain base for now as it matches the existing config pattern
    const domain = 'https://onaffair.oss-cn-hangzhou.aliyuncs.com'

    for (const folder of folders) {
      // Assuming folder.path is the directory name under ZIP/, e.g., "cat"
      const prefix = `ZIP/${folder.path}/` 
      
      logger.info(`Refreshing folder: ${folder.name} (${prefix})`)
      
      const objects = await oss.list({
        prefix: prefix,
        'max-keys': 1000
      })
      
      if (!objects) {
        logger.warn(`Failed to list files for ${folder.name}`)
        newFolders.push(folder) // Keep original if failed
        continue
      }
      
      // Filter files (exclude directory marker itself if present)
      const files = objects
        .filter((obj: any) => obj.name !== prefix && !obj.name.endsWith('/'))
        .map((obj: any) => `${domain}/${obj.name}`)
      
      newFolders.push({
        ...folder,
        children: files
      })
      
      logger.info(`Found ${files.length} files for ${folder.name}`)
    }
    
    // Update config
    updateConfig({
      resource: {
        ...config.resource,
        folder: newFolders
      }
    })
    
    logger.info('Resource refresh completed and config updated.')
    
  } catch (error) {
    logger.error('Error refreshing resources:', error)
  }
}

export function startScheduler() {
  // Run immediately on startup
  refreshResources()
  
  // Schedule
  setInterval(refreshResources, UPDATE_INTERVAL)
  logger.info(`Scheduler started. Interval: ${UPDATE_INTERVAL}ms`)
}
