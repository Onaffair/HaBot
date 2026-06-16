import fs from 'fs'
import path from 'path'

const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const LOG_RETENTION_DAYS = 30

function getDateStr(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

/** 清理超过保留天数的旧日志文件 */
function cleanStaleLogs(): void {
  try {
    const files = fs.readdirSync(logDir)
    const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
    for (const file of files) {
      const filePath = path.join(logDir, file)
      const stat = fs.statSync(filePath)
      if (stat.isFile() && stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath)
      }
    }
  } catch {
    // 清理失败不影响主流程
  }
}

// 启动时执行一次旧日志清理
cleanStaleLogs()

export class Logger {
  private context: string
  private currentDate: string = ''
  private logFile: string = ''

  constructor(context: string) {
    this.context = context
    this.rotateLog()
  }

  /** 按日期切换日志文件 */
  private rotateLog(): void {
    const today = getDateStr()
    if (today !== this.currentDate) {
      this.currentDate = today
      this.logFile = path.join(logDir, `app-${today}.log`)
    }
  }

  private getTime(): string {
    return new Date().toISOString()
  }

  private format(level: string, message: string, args: any[]): string {
    const argsStr = args.length > 0 ? ' ' + args.map(a => {
      if (a instanceof Error) {
        return a.stack || a.message
      }
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a)
        } catch {
          return String(a)
        }
      }
      return String(a)
    }).join(' ') : ''
    return `[${this.getTime()}] [${level}] [${this.context}] ${message}${argsStr}`
  }

  private writeToFile(text: string): void {
    try {
      this.rotateLog() // 写入前检查日期是否变更
      fs.appendFileSync(this.logFile, text + '\n')
    } catch (e) {
      process.stderr.write(`Failed to write to log file: ${e}\n`)
    }
  }

  info(message: string, ...args: any[]): void {
    const text = this.format('INFO', message, args)
    console.log(text)
    this.writeToFile(text)
  }

  warn(message: string, ...args: any[]): void {
    const text = this.format('WARN', message, args)
    console.warn(text)
    this.writeToFile(text)
  }

  error(message: string, ...args: any[]): void {
    const text = this.format('ERROR', message, args)
    console.error(text)
    this.writeToFile(text)
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      const text = this.format('DEBUG', message, args)
      console.debug(text)
      this.writeToFile(text)
    }
  }
}

export const createLogger = (context: string) => new Logger(context)
