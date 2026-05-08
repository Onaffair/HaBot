import fs from 'fs'
import path from 'path'

const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

export class Logger {
  private context: string
  private logFile: string

  constructor(context: string) {
    this.context = context
    this.logFile = path.join(logDir, 'app.log')
    fs.writeFileSync(this.logFile, '')
  }

  private getTime() {
    return new Date().toISOString()
  }

  private format(level: string, message: string, args: any[]) {
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

  private writeToFile(text: string) {
    try {
      fs.appendFileSync(this.logFile, text + '\n')
    } catch (e) {
      // Avoid infinite loop if logging fails
      process.stderr.write(`Failed to write to log file: ${e}\n`)
    }
  }

  info(message: string, ...args: any[]) {
    const text = this.format('INFO', message, args)
    console.log(text)
    this.writeToFile(text)
  }

  warn(message: string, ...args: any[]) {
    const text = this.format('WARN', message, args)
    console.warn(text)
    this.writeToFile(text)
  }

  error(message: string, ...args: any[]) {
    const text = this.format('ERROR', message, args)
    console.error(text)
    this.writeToFile(text)
  }

  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      const text = this.format('DEBUG', message, args)
      console.debug(text)
      this.writeToFile(text)
    }
  }
}

export const createLogger = (context: string) => new Logger(context)
