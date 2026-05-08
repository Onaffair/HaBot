import WebSocket from 'ws'
import { EventEmitter } from 'events'
import config from '@config'
import type { Message } from '@/interface/messageReceiveType'
import { createLogger } from '@utils/logger'

const logger = createLogger('BotClient')

export default class BotClient extends EventEmitter {
  private readonly url: string
  private readonly token?: string
  private ws: WebSocket | null
  private reconnectAttempts: number
  private heartbeatTimer: NodeJS.Timeout | null
  private heartbeatTimeoutTimer: NodeJS.Timeout | null
  private readonly heartbeatInterval: number
  private readonly heartbeatTimeout: number
  private readonly backoffBase: number
  private readonly backoffMax: number
  private outbox: Array<{ type: string; data: any; attempts: number }>
  private readonly maxSendRetries: number

  constructor() {
    super()
    this.url = config.ws.url
    this.token = config.ws.token
    this.ws = null
    this.reconnectAttempts = 0
    this.heartbeatTimer = null
    this.heartbeatTimeoutTimer = null
    this.heartbeatInterval = 30000
    this.heartbeatTimeout = 10000
    this.backoffBase = 1000
    this.backoffMax = 30000
    this.outbox = []
    this.maxSendRetries = 3
  }

  connect(): void {
    const fullUrl = this.token ? `${this.url}?access_token=${this.token}` : this.url
    this.ws = new WebSocket(fullUrl)
    logger.info("startConnect to Server");
    
    this.ws.on('open', () => {
      logger.info('WebSocket connected')
      this.reconnectAttempts = 0
      this.emit('system.online')
      this.startHeartbeat()
      this.flushOutbox()
    })

    this.ws.on('message', (data: string) => {
      try {
        const jsonData: Message = JSON.parse(data)

        // 触发通用消息事件，交由上层（App）处理过滤和分发
        this.emit('message', jsonData)
      } catch (e) {
        logger.error('Message parse error:', e)
      }
    })

    this.ws.on('close', () => {
      logger.info("WebSocket disconnected");
      
      this.stopHeartbeat()
      this.scheduleReconnect()
    })

    this.ws.on('error', (err: Error) => {
      logger.error("wsError: ", err);
      
      this.stopHeartbeat()
      this.scheduleReconnect()
    })

    this.ws.on('pong', () => {
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer)
        this.heartbeatTimeoutTimer = null
      }
    })
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) return
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      try {
        this.ws.ping()
        if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer)
        this.heartbeatTimeoutTimer = setTimeout(() => {
          try {
            this.ws?.terminate()
          } catch { }
        }, this.heartbeatTimeout)
      } catch { }
    }, this.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts += 1
    const exp = Math.min(this.backoffMax, this.backoffBase * 2 ** (this.reconnectAttempts - 1))
    const jitter = Math.floor(Math.random() * 500)
    const delay = exp + jitter
    setTimeout(() => this.connect(), delay)
  }

  private trySend(msg: { type: string; data: any; attempts: number }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.outbox.push(msg)
      return
    }
    try {
      const { type, data } = msg
      this.ws.send(JSON.stringify({ type, data }))
    } catch {
      msg.attempts += 1
      if (msg.attempts < this.maxSendRetries) {
        setTimeout(() => this.trySend(msg), 500 * msg.attempts)
      } else {
        this.outbox.push({ ...msg, attempts: 0 })
      }
    }
  }

  private flushOutbox() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const pending = [...this.outbox]
    this.outbox = []
    for (const m of pending) {
      this.trySend(m)
    }
  }
}
