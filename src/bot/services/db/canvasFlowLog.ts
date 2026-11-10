import { db } from '@utils/db'
import { createLogger } from '@utils/logger'

// ============================================================================
// 画布流转日志数据服务
// ----------------------------------------------------------------------------
// 规则引擎每完成一次画布流转落一行（触发消息 + 会话群号 + 流转结果），
// 供前端画布列表的「日志」弹窗分页回溯。写入是旁路观测能力：
// 任何失败只记警告，绝不向上抛，避免影响消息处理主流程。
// 每张画布仅保留最近 MAX_LOGS_PER_CANVAS 条，防止无界增长。
// ============================================================================

const logger = createLogger('CanvasFlowLog')

/** 单画布保留的日志上限，超出按写入顺序淘汰最旧 */
const MAX_LOGS_PER_CANVAS = 200

/** 流转状态：success=全部节点正常，error=存在节点异常 */
export type FlowLogStatus = 'success' | 'error'

/** 对外流转日志模型 */
export interface CanvasFlowLog {
  id: number
  canvasId: number
  /** 群号，私聊为空串 */
  groupId: string
  /** 触发流转的消息文本 */
  message: string
  status: FlowLogStatus
  /** 异常摘要（失败节点与原因），正常为空 */
  error?: string | null
  createdAt: Date
}

export interface CreateFlowLogInput {
  canvasId: number
  groupId?: string
  message?: string
  status?: FlowLogStatus
  error?: string | null
}

export interface FlowLogPageQuery {
  skip: number
  take: number
  canvasId: number
  /** 按消息内容模糊匹配 */
  keyword?: string
  /** 按状态过滤（'success' | 'error'），缺省不过滤 */
  status?: FlowLogStatus
}

class CanvasFlowLogService {
  /** 写入一条流转日志（含容量淘汰），失败仅告警 */
  async record(data: CreateFlowLogInput): Promise<void> {
    if (!db.canvasFlowLog) return
    try {
      await db.canvasFlowLog.create({
        data: {
          canvasId: data.canvasId,
          groupId: data.groupId ?? '',
          message: data.message ?? '',
          status: data.status ?? 'success',
          error: data.error ?? null,
        },
      })
      await this.pruneByCanvas(data.canvasId)
    } catch (e: any) {
      logger.warn(`写入画布流转日志失败（忽略）: ${e?.message || e}`)
    }
  }

  /**
   * 分页查询（画布日志弹窗）
   * 返回 { list, total } 顶层结构，与前端 useTable 解构约定一致，按时间倒序。
   */
  async findPaged(
    q: FlowLogPageQuery,
  ): Promise<{ list: CanvasFlowLog[]; total: number }> {
    if (!db.canvasFlowLog) return { list: [], total: 0 }
    const where: Record<string, any> = { canvasId: q.canvasId }
    if (q.keyword) where.message = { contains: q.keyword }
    if (q.status) where.status = q.status
    const [rows, total] = await Promise.all([
      db.canvasFlowLog.findMany({ where, orderBy: { id: 'desc' }, skip: q.skip, take: q.take }),
      db.canvasFlowLog.count({ where }),
    ])
    // status 在库内为字符串，出参收窄为联合类型
    return { list: rows.map((row) => ({ ...row, status: row.status as FlowLogStatus })), total }
  }

  /** 删除画布时一并清理其日志 */
  async deleteByCanvas(canvasId: number): Promise<void> {
    if (!db.canvasFlowLog) return
    await db.canvasFlowLog.deleteMany({ where: { canvasId } })
  }

  /** 保留最新 MAX_LOGS_PER_CANVAS 条，其余删除（以第 N 新记录的 id 为界） */
  private async pruneByCanvas(canvasId: number): Promise<void> {
    if (!db.canvasFlowLog) return
    const cutoff = await db.canvasFlowLog.findFirst({
      where: { canvasId },
      orderBy: { id: 'desc' },
      skip: MAX_LOGS_PER_CANVAS - 1,
      take: 1,
      select: { id: true },
    })
    if (!cutoff) return
    await db.canvasFlowLog.deleteMany({ where: { canvasId, id: { lt: cutoff.id } } })
  }
}

export const canvasFlowLogService = new CanvasFlowLogService()
export default CanvasFlowLogService
