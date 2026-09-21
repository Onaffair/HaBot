import { Command } from "@/core/command";
import { ActionResult } from "@/interface/actoin";
import { Session } from "@/core/session";
import { createLogger } from "@/utils/logger";
import { Redis } from "@/utils/redis";



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
    let groupMessageList = redis.get(groupId)
    if (!groupMessageList) {
      redis.set(groupId, [], 24 * 60 * 60 * 1000)
      groupMessageList = redis.get(groupId)
    }
    const messageHash = groupId.toString().concat(`-${JSON.stringify(message)}`)
    const isExist = redis.get(messageHash)
    if (isExist) return false
    const list = (groupMessageList.value ?? []) as Array<any>
    // 额外判断：倒数第二条（即当前消息的上一条）须与当前消息一致才返回 true
    const prevMessage = list[list.length - 1]
    const isConsecutive =
      !!prevMessage && JSON.stringify(prevMessage) === JSON.stringify(message)

    list.push(message)

    // 需与上一条消息一致（连续消息）才触发
    return isConsecutive
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




