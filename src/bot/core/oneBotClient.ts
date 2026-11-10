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
/** 连接存活超过该时长才视为「稳定连接」，断开时才重置退避次数；
 * 防止「连上就断」时退避永远停在初始值、退化成高频重连 */
const STABLE_CONNECTION_MS = 10_000

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
  /** 待执行的重连定时器：同一时刻只允许存在一个，防止重复调度造成重连风暴 */
  private reconnectTimer: NodeJS.Timeout | null
  /** 主动断开标记：true 时 close 不再触发重连 */
  private manualClose: boolean
  /** 当前连接的建立时间，用于判定连接是否稳定（见 STABLE_CONNECTION_MS） */
  private openedAt: number
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
    this.reconnectTimer = null
    this.manualClose = false
    this.openedAt = 0
    this.heartbeatTimer = null
    this.heartbeatTimeoutTimer = null
    this.outbox = []
  }

  /** 建立到 OneBot 服务器的连接；重复调用会先关闭旧连接 */
  connect(): void {
    // 清掉待执行的重连定时器并复位主动断开标记：本次连接由用户/重连定时器主动发起
    this.manualClose = false
    this.clearReconnectTimer()
    // 旧连接先摘监听再终止：否则旧连接的 close/error 会再排一次重连，导致连接数翻倍
    this.detachSocket()

    const fullUrl = this.token ? `${this.url}?access_token=${this.token}` : this.url
    const socket = new WebSocket(fullUrl)
    this.ws = socket
    logger.info(`start connect to ${this.url}`)

    // 所有回调都以 socket 身份校验：已被替换或已主动断开的旧连接事件一律忽略
    socket.on('open', () => {
      if (this.ws !== socket) return
      logger.info('WebSocket connected')
      this.openedAt = Date.now()
      this.emit('system.online')
      this.startHeartbeat()
      this.flushOutbox()
    })

    socket.on('message', (data: string) => {
      if (this.ws !== socket) return
      try {
        const jsonData: OneBotMessageReceive = JSON.parse(data)
        // 仅将真正的聊天消息（post_type === 'message'）交给上层业务管道；
        // 心跳（meta_event）、通知（notice）、请求（request）等非消息事件不入命令链，
        // 避免无 message 段的事件在过滤器/命令匹配时抛错或被误记日志。
        if (jsonData?.post_type !== 'message') {
          return
        }
        this.emit('message', jsonData)
      } catch (e) {
        logger.error('message parse error:', e?.message)
      }
    })

    socket.on('close', () => {
      // close 是断线的唯一收口：error 之后必然跟随 close，重连只在此处调度一次
      if (this.ws !== socket) return
      this.ws = null
      logger.info('WebSocket disconnected')
      this.stopHeartbeat()
      this.emit('system.offline')
      // 只有连接存活足够久才重置退避，否则保留递增的退避次数继续退让
      if (this.openedAt && Date.now() - this.openedAt >= STABLE_CONNECTION_MS) {
        this.reconnectAttempts = 0
      }
      this.openedAt = 0
      this.scheduleReconnect()
    })

    socket.on('error', (err: Error) => {
      if (this.ws !== socket) return
      logger.error('ws error:', err.message)
      this.stopHeartbeat()
      // 不在此处重连：交给随后的 close 事件统一调度，避免一次断线排两次重连
    })

    socket.on('pong', () => {
      if (this.ws !== socket) return
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer)
        this.heartbeatTimeoutTimer = null
      }
    })
  }

  /** 主动断开，不再触发重连（用于进程退出或替换连接） */
  disconnect(): void {
    this.manualClose = true
    this.clearReconnectTimer()
    this.stopHeartbeat()
    this.detachSocket()
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
      // 固定本次心跳针对的 socket：超时回调只允许终止它自己，避免误杀刚建立的新连接
      const socket = this.ws
      if (!socket || socket.readyState !== WebSocket.OPEN) return
      try {
        socket.ping()
        if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer)
        this.heartbeatTimeoutTimer = setTimeout(() => {
          try { socket.terminate() } catch { /* 忽略 */ }
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
    // 已有待执行的重连或已主动断开：不重复调度，保证一次断线只排一个定时器
    if (this.manualClose || this.reconnectTimer) return
    this.reconnectAttempts += 1
    const exp = Math.min(this.backoffMax, this.backoffBase * 2 ** (this.reconnectAttempts - 1))
    const jitter = Math.floor(Math.random() * 500)
    const delay = exp + jitter
    logger.warn(`reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.manualClose) return
      this.connect()
    }, delay)
  }

  /** 摘掉当前 socket 的监听并终止，避免旧连接的事件继续驱动重连/心跳 */
  private detachSocket(): void {
    const socket = this.ws
    this.ws = null
    this.openedAt = 0
    if (!socket) return
    socket.removeAllListeners()
    try { socket.terminate() } catch { /* 忽略旧连接终止异常 */ }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
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
