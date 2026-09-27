import { get, post } from './request'

// ============================================================================
// Bot 生命周期控制 API
// ----------------------------------------------------------------------------
// 对应后端 /api/bot/* 路由：查询状态、启动、停止。
// ============================================================================

interface BotStatus {
  running: boolean
  /** 连接参数已修改但尚未重启生效（Bot 停止时改配置会为 true） */
  configStale?: boolean
}

class BotControlApi {
  /** 查询 Bot 当前运行状态 */
  static status() {
    return get<BotStatus>('/bot/status')
  }

  /** 启动 Bot */
  static start() {
    return post<BotStatus>('/bot/start')
  }

  /** 停止 Bot */
  static stop() {
    return post<BotStatus>('/bot/stop')
  }

  /** 重启 Bot：以最新系统配置重建连接 */
  static restart() {
    return post<BotStatus>('/bot/restart')
  }
}

export default BotControlApi
