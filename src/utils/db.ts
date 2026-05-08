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
    // 优先使用 config 中的 URL，其次使用环境变量（Prisma 默认行为，但也允许我们在这里显式处理），或者默认值
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
      // 尝试直接初始化，依赖 schema.prisma 中的 env("DATABASE_URL")
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

  /**
   * 获取所有资源分类
   */
  public async getResourceCategories() {
    if (!this.prisma) return []
    return this.prisma.resourceCategory.findMany()
  }

  /**
   * 根据分类名称获取资源列表
   * @param categoryName 分类名称
   */
  public async getResourcesByCategory(categoryName: string) {
    if (!this.prisma) return []
    const category = await this.prisma.resourceCategory.findUnique({
      where: { name: categoryName },
      include: { items: true }
    })
    
    // 过滤掉未启用的资源
    return category?.items.filter(item => item.isActive) || []
  }

  /**
   * 添加资源项
   * @param categoryName 分类名称
   * @param content 资源内容
   */
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

  /**
   * 初始化资源分类（从配置文件同步到数据库）
   */
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

  /**
   * 随机获取某个分类下的一个资源
   */
  public async getRandomResource(categoryName: string) {
    const items = await this.getResourcesByCategory(categoryName)
    if (items.length === 0) return null
    const randomIndex = Math.floor(Math.random() * items.length)
    return items[randomIndex]
  }

  /**
   * 通用查询方法 (示例: 获取任意模型数据)
   * @param model 模型名称 (如 'resourceCategory')
   * @param args Prisma查询参数
   */
  public async findMany<T = any>(model: keyof PrismaClient, args?: any): Promise<T[]> {
    if (!this.prisma) return []
    // @ts-ignore - 动态访问模型
    if (this.prisma[model] && typeof this.prisma[model].findMany === 'function') {
        // @ts-ignore
        return this.prisma[model].findMany(args)
    }
    return []
  }
}

export const db = DatabaseService.getInstance()
export default db
