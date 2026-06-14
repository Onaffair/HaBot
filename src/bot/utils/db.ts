import { BeanFactory } from '@/core/bean';
import type { ResourceConfig } from '@/beans/resource.bean';
import type { DatabaseConfig } from '@/beans/database.bean';
import { PrismaClient } from '@prisma/client'
import { createLogger } from '@utils/logger'

const factory = BeanFactory.getInstance()
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


export default DatabaseService;
export const db = DatabaseService.getInstance()
