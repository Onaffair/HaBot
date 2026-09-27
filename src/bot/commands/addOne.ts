import { Command } from "@/core/command";
import { ActionResult } from "@/interface/actoin";
import { Session } from "@/core/session";
import { createLogger } from "@/utils/logger";
import { Redis } from "@/utils/redis";
import { getPreviousGroupMessage } from "@/utils/groupMessageTrace";



const logger = createLogger('addOne')
const redis = Redis.getInstance()
class AddOneCmd implements Command {
  name = '+1'
  description = '群聊+1'
  priority = 0

  match(session) {
    if (session.messageType != 'group') return false
    const groupId = session.groupId.toString()
    const message = session.message

    // 去重：同一群内相同内容触发过一次后，一段时间内不再重复 +1（防止机器人自身回声连环触发）
    const messageHash = groupId.toString().concat(`-${JSON.stringify(message)}`)
    if (redis.get(messageHash)) return false

    // 连续判定：与「上一条群消息」完全一致才触发。
    // 上一条消息由 groupMessageTrace 过滤器统一记录，不受本命令是否被高优先级命令提前命中影响
    const prevMessage = getPreviousGroupMessage(groupId)
    return !!prevMessage && prevMessage === JSON.stringify(message)
  }
  handle(session) {
    const groupId = session.groupId.toString()
    const message = session.message
    const messageHash = groupId.toString().concat(`-${JSON.stringify(message)}`)
    redis.set(messageHash, true, 24 * 60 * 60 * 1000)

    return {
      type: 'message',
      items: message
    } as ActionResult
  }
}
/** 导出的命令实例，由 commands/index.ts 显式注册 */
export const addOneCmd = new AddOneCmd()




