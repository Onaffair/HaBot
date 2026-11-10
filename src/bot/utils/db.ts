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

  /** Typed delegate: user_blacklist 表操作 */
  get userBlacklist() {
    return this.prisma?.userBlacklist
  }

  /** Typed delegate: canvases 表操作 */
  get canvas() {
    return this.prisma?.canvas
  }

  /** Typed delegate: canvas_flow_logs 表操作 */
  get canvasFlowLog() {
    return this.prisma?.canvasFlowLog
  }

  /** Typed delegate: system_configs 表操作 */
  get systemConfig() {
    return this.prisma?.systemConfig
  }

  /** Typed delegate: ai_personas 表操作 */
  get aiPersona() {
    return this.prisma?.aiPersona
  }

  /** Typed delegate: user_profiles 表操作 */
  get userProfile() {
    return this.prisma?.userProfile
  }
}
export default DatabaseService;
export const db = DatabaseService.getInstance()