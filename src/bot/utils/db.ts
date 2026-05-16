import { PrismaClient } from '@prisma/client'
import config from '@config'
import { createLogger } from '@utils/logger'

const logger = createLogger('DB')

class DatabaseService {
  private static instance: DatabaseService
  public prisma: PrismaClient | undefined

  private constructor() {
    this.initPrisma()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  private initPrisma() {
    const dbUrl = config.database?.url || process.env.DATABASE_URL

    if (dbUrl) {
      try {
        this.prisma = new PrismaClient({
          // @ts-ignore
          datasources: {
            db: {
              url: dbUrl
            }
          },
          log: ['query', 'info', 'warn', 'error']
        })
        logger.info('Prisma Client initialized')
      } catch (e) {
        logger.error('Failed to initialize Prisma Client', e)
      }
    } else {
      try {
        this.prisma = new PrismaClient({
             log: ['query', 'info', 'warn', 'error']
        })
        logger.info('Prisma Client initialized (using default env)')
      } catch(e) {
         logger.warn('Database URL not configured and default init failed')
      }
    }
  }

  public async getResourceCategories() {
    if (!this.prisma) return []
    return this.prisma.resourceCategory.findMany()
  }

  public async getResourcesByCategory(categoryName: string) {
    if (!this.prisma) return []
    const category = await this.prisma.resourceCategory.findUnique({
      where: { name: categoryName },
      include: { items: true }
    })
    
    return category?.items.filter(item => item.isActive) || []
  }

  public async addResource(categoryName: string, content: string) {
    if (!this.prisma) return null
    
    const category = await this.prisma.resourceCategory.findUnique({ 
      where: { name: categoryName } 
    })
    
    if (!category) {
      logger.error(`Category ${categoryName} not found`)
      throw new Error(`Category ${categoryName} not found`)
    }
    
    return this.prisma.resourceItem.create({
      data: {
        categoryId: category.id,
        content
      }
    })
  }

  public async syncCategoriesFromConfig() {
    if (!this.prisma) return
    
    const folders = config.resource.folder
    if (!folders || !Array.isArray(folders)) return

    logger.info('Syncing categories from config...')
    
    for (const folder of folders) {
      try {
        await this.prisma.resourceCategory.upsert({
          where: { name: folder.name },
          update: {
            path: folder.path,
            type: folder.type
          },
          create: {
            name: folder.name,
            path: folder.path,
            type: folder.type
          }
        })
      } catch (e) {
        logger.error(`Failed to sync category ${folder.name}:`, e)
      }
    }
    logger.info('Categories synced')
  }

  public async getRandomResource(categoryName: string) {
    const items = await this.getResourcesByCategory(categoryName)
    if (items.length === 0) return null
    const randomIndex = Math.floor(Math.random() * items.length)
    return items[randomIndex]
  }

  public async findMany<T = any>(model: keyof PrismaClient, args?: any): Promise<T[]> {
    if (!this.prisma) return []
    // @ts-ignore
    if (this.prisma[model] && typeof this.prisma[model].findMany === 'function') {
        // @ts-ignore
        return this.prisma[model].findMany(args)
    }
    return []
  }
}

export const db = DatabaseService.getInstance()
export default db
