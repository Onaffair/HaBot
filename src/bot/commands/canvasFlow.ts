import { Command } from '@/core/command'
import { createLogger } from '@utils/logger'
import { ruleEngine } from '@/services/flow'
import type { Session } from '@/core/session'

// ============================================================================
// 画布流程命令（规则引擎接入点）
// ----------------------------------------------------------------------------
// 把「画布驱动的规则引擎」作为一个普通命令扩展点接入现有管道，不改框架：
//  - match：任一启用画布的触发器命中当前消息即匹配（纯判断，无副作用）；
//  - handle：交由引擎从触发节点流转，消息在 output 节点内经 session 直接发送，
//            支持一次流转命中多个终点，故 handle 不返回 ActionResult。
// 优先级刻意低于交互式命令（如 AI 聊天），让专用命令优先，画布流程作为配置化兜底。
// ============================================================================

const logger = createLogger('CanvasFlow')

/** 画布流程命令优先级：低于 AI 聊天等交互命令，高于默认(0)的资源/规则命令 */
const CANVAS_FLOW_PRIORITY = 10

export const canvasFlowCmd: Command = {
  name: '画布流程',
  description: '按画布配置的节点流程处理消息（触发器 → 流转 → 消息发送）',
  priority: CANVAS_FLOW_PRIORITY,
  match: (session: Session) => ruleEngine.existsMatch(session),
  handle: async (session: Session) => {
    try {
      await ruleEngine.run(session)
    } catch (e: any) {
      // 引擎内部已逐节点捕获，这里兜底捕获流转整体异常，避免未处理拒绝冒泡
      logger.error(`Canvas flow execution failed: ${e?.message || e}`)
    }
    // 发送已在 output 节点完成，返回 undefined 交由后续更高优先级逻辑之外结束本次匹配
    return undefined
  },
}
