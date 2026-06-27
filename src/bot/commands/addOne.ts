import { Command, CommandFactory } from "@/core/command";
import { ActionResult } from "@/interface/actoin";
import { Session } from "@/interface/session";
import { createLogger } from "@/utils/logger";
import { Redis } from "@/utils/redis";



const logger = createLogger('addOne')
const redis = Redis.getInstance()
class AddOneCmd implements Command {
  name = '+1'
  description = '群聊+1'
  priority = 100

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
    groupMessageList.value?.push(message)
    const count = (groupMessageList.value as Array<any>).filter(t => JSON.stringify(t) == JSON.stringify(message))?.length
    return count > 1
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
CommandFactory.getInstance().registry(new AddOneCmd())




