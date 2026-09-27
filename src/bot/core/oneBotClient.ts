import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { createLogger } from '@utils/logger'
import { configService } from '@/services/db/systemConfig'
import type { OneBotMessageReceive } from '@/interface/onebot'

/**
 * OneBotClient 构造参数。
 * 环境变量读取由调用方（App / 独立入口）负责，SDK 只接收显式配置，
 * 便于测试与未来替换传输实现（HTTP 轮询 / 多实例）。
 */
export interface OneBotClientOptions {
  /** OneBot 反向 WS 服务器地址，如 ws://127.0.0.1:3001 */
  url: string
  /** 鉴权 access_token，未配置则不拼接查询串 */
  token?: string
  /** 心跳间隔（毫秒），默认 30_000 */
  heartbeatInterval?: number
  /** 心跳响应等待超时（毫秒），默认 10_000 */
  heartbeatTimeout?: number
  /** 断线重连的指数退避基数（毫秒），默认 1_000 */
  backoffBase?: number
  /** 断线重连的最大单次退避（毫秒），默认 30_000 */
  backoffMax?: number
  /** 单次消息发送的最大重试次数，默认 3 */
  maxSendRetries?: number
}

/** 默认心跳时长与重连参数，抽出为常量避免魔法数字 */
const DEFAULT_HEARTBEAT_INTERVAL = 30_000
const DEFAULT_HEARTBEAT_TIMEOUT = 10_000
const DEFAULT_BACKOFF_BASE = 1_000
const DEFAULT_BACKOFF_MAX = 30_000
const DEFAULT_MAX_SEND_RETRIES = 3

interface OutboxMessage {
  type: string
  data: any
  attempts: number
}

const logger = createLogger('OneBotClient')

/**
 * OneBot 反向 WebSocket 客户端。
 *
 * 职责：连接生命周期（open/close/error）、心跳保活、指数退避重连、
 * 离线消息 outbox 重试。业务处理不在此处，收到消息后仅 emit('message')，
 * 由上层（App）订阅并路由。
 */
export class OneBotClient extends EventEmitter {
  private readonly url: string
  private readonly token?: string
  private readonly heartbeatInterval: number
  private readonly heartbeatTimeout: number
  private readonly backoffBase: number
  private readonly backoffMax: number
  private readonly maxSendRetries: number

  private ws: WebSocket | null
  private reconnectAttempts: number
  private heartbeatTimer: NodeJS.Timeout | null
  private heartbeatTimeoutTimer: NodeJS.Timeout | null
  private outbox: OutboxMessage[]

  constructor(options: OneBotClientOptions) {
    super()
    this.url = options.url
    this.token = options.token
    this.heartbeatInterval = options.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL
    this.heartbeatTimeout = options.heartbeatTimeout ?? DEFAULT_HEARTBEAT_TIMEOUT
    this.backoffBase = options.backoffBase ?? DEFAULT_BACKOFF_BASE
    this.backoffMax = options.backoffMax ?? DEFAULT_BACKOFF_MAX
    this.maxSendRetries = options.maxSendRetries ?? DEFAULT_MAX_SEND_RETRIES

    this.ws = null
    this.reconnectAttempts = 0
    this.heartbeatTimer = null
    this.heartbeatTimeoutTimer = null
    this.outbox = []
  }

  /** 建立到 OneBot 服务器的连接；重复调用会先关闭旧连接 */
  connect(): void {
    if (this.ws) {
      try { this.ws.close() } catch { /* 忽略旧连接关闭异常 */ }
    }
    const fullUrl = this.token ? `${this.url}?access_token=${this.token}` : this.url
    this.ws = new WebSocket(fullUrl)
    logger.info(`start connect to ${this.url}`)

    this.ws.on('open', () => {
      logger.info('WebSocket connected')
      this.reconnectAttempts = 0
      this.emit('system.online')
      this.startHeartbeat()
      this.flushOutbox()
    })

    this.ws.on('message', (data: string) => {
      try {
        const jsonData: OneBotMessageReceive = JSON.parse(data)
        this.emit('message', jsonData)
      } catch (e) {
        logger.error('message parse error:', e?.message)
      }
    })

    this.ws.on('close', () => {
      logger.info('WebSocket disconnected')
      this.stopHeartbeat()
      this.emit('system.offline')
      this.scheduleReconnect()
    })

    this.ws.on('error', (err: Error) => {
      logger.error('ws error:', err.message)
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

  /** 主动断开，不再触发重连（用于进程退出或替换连接） */
  disconnect(): void {
    this.stopHeartbeat()
    if (!this.ws) return
    // 移除内部 close/error 监听触发的重连：通过置空 + removeAllListeners 达成
    this.ws.removeAllListeners()
    try { this.ws.close() } catch { /* 忽略 */ }
    this.ws = null
  }

  /** 向服务端发送一条已封包的消息（如 OneBot 动作请求）；未连接时进入 outbox */
  send(payload: { type: string; data: any }): void {
    this.trySend({ ...payload, attempts: 0 })
  }

  // --------------------------------------------------------------------------
  // 心跳 / 重连 / 出站重试
  // --------------------------------------------------------------------------
  private startHeartbeat(): void {
    if (this.heartbeatTimer) return
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      try {
        this.ws.ping()
        if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer)
        this.heartbeatTimeoutTimer = setTimeout(() => {
          try { this.ws?.terminate() } catch { /* 忽略 */ }
        }, this.heartbeatTimeout)
      } catch { /* 心跳失败不阻断，等待 close/error 触发重连 */ }
    }, this.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts += 1
    const exp = Math.min(this.backoffMax, this.backoffBase * 2 ** (this.reconnectAttempts - 1))
    const jitter = Math.floor(Math.random() * 500)
    const delay = exp + jitter
    setTimeout(() => this.connect(), delay)
  }

  private trySend(msg: OutboxMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.outbox.push(msg)
      return
    }
    try {
      const { type, data } = msg
      this.ws.send(JSON.stringify({ type, data }))
    } catch (e) {
      msg.attempts += 1
      if (msg.attempts < this.maxSendRetries) {
        setTimeout(() => this.trySend(msg), 500 * msg.attempts)
      } else {
        this.outbox.push({ ...msg, attempts: 0 })
      }
    }
  }

  private flushOutbox(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const pending = [...this.outbox]
    this.outbox = []
    for (const m of pending) this.trySend(m)
  }
}

/**
 * 从 ConfigService 读取 WS 配置构造 OneBotClient。
 * 集中在此读取，避免 SDK 内部耦合具体配置源。
 */
export function createOneBotClientFromEnv(): OneBotClient {
  return new OneBotClient({
    url: configService.get('WS_URL', ''),
    token: configService.get('WS_TOKEN') || undefined,
  })
}

export default OneBotClient
