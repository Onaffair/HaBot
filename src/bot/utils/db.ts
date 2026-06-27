import { PrismaClient } from '@prisma/client'
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
    const dbUrl = process.env.DATABASE_URL
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
      } catch (e) {
        logger.warn('Database URL not configured and default init failed')
      }
    }
  }

  /** Typed delegate: group_listens 表操作 */
  get groupListen() {
    return this.prisma?.groupListen
  }

  /** Typed delegate: resource_categories 表操作 */
  get resourceCategory() {
    return this.prisma?.resourceCategory
  }

  /** Typed delegate: chat_memories 表操作 */
  get chatMemory() {
    return this.prisma?.chatMemory
  }

  /** Typed delegate: memory_summaries 表操作 */
  get memorySummary() {
    return this.prisma?.memorySummary
  }
}
export default DatabaseService;
export const db = DatabaseService.getInstance()
