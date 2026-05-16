import OSS from 'ali-oss'
import config from '@config'
import { createLogger } from './logger'

const logger = createLogger('OSS')

export class OSSService {
  private client: OSS
  private initialized: boolean = false

  constructor() {
    this.init()
  }

  private init() {
    const { region, accessKeyId, accessKeySecret, bucket } = config.oss
    if (region && accessKeyId && accessKeySecret && bucket) {
      this.client  = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket
      })
      this.initialized = true
      logger.info('OSS client initialized successfully')
    } else {
      logger.warn('OSS configuration missing, OSS service disabled')
      this.initialized = false
    }
  }

  async put(name: string, file: string | Buffer) {
    if (!this.initialized) {
      logger.error('OSS not initialized')
      return null
    }
    try {
      const result = await this.client.put(name, file)
      logger.info(`File uploaded: ${name}`)
      return result
    } catch (e) {
      logger.error(`Upload failed: ${name}`, e)
      return null
    }
  }

  async get(name: string) {
    if (!this.initialized) {
      logger.error('OSS not initialized')
      return null
    }
    try {
      const result = await this.client.get(name)
      return result
    } catch (e) {
      logger.error(`Download failed: ${name}`, e)
      return null
    }
  }

  async delete(name: string) {
    if (!this.initialized) {
      logger.error('OSS not initialized')
      return null
    }
    try {
      const result = await this.client.delete(name)
      logger.info(`File deleted: ${name}`)
      return result
    } catch (e) {
      logger.error(`Delete failed: ${name}`, e)
      return null
    }
  }

  async list(query?: any) {
    if (!this.initialized) {
      logger.error('OSS not initialized')
      return null
    }
    try {
      const result = await this.client.list(query, {})
      return result.objects
    } catch (e) {
      logger.error('List failed', e)
      return null
    }
  }

  async listDirectories(prefix: string) {
    if (!this.initialized) {
      logger.error('OSS not initialized')
      return []
    }
    try {
      const p = prefix.endsWith('/') ? prefix : `${prefix}/`
      const result = await this.client.list({
        prefix: p,
        delimiter: '/',
        'max-keys': 1000
      }, {})
      
      return result.prefixes || []
    } catch (e) {
      logger.error(`List directories failed: ${prefix}`, e)
      return []
    }
  }

  async getDirFiles(dirPrefix: string): Promise<string[]> {
    if (!this.initialized) {
      logger.error('OSS not initialized')
      return []
    }
    try {
      const prefix = dirPrefix && !dirPrefix.endsWith('/') ? `${dirPrefix}/` : dirPrefix
      
      const result = await this.client.list({
        prefix,
        'max-keys': 1000
      }, {})

      if (!result.objects || result.objects.length === 0) {
        return []
      }
      return result.objects
        .filter(obj => !obj.name.endsWith('/'))
        .map(obj => obj.url)
    } catch (e) {
      logger.error(`Failed to get files from dir: ${dirPrefix}`, e)
      return []
    }
  }
}

export const ossService = new OSSService()
