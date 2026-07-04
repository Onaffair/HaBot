import { BeanFactory } from "@/core/bean";
import { Filter, FilterFactory } from "@/core/filter";
import { OneBotMessageReceive } from "@/interface/onebot";
import { createLogger } from '@utils/logger'

const factory = BeanFactory.getInstance()
const logger = createLogger('ToMeFilter')

const toMeFilter: Filter = {
  name: '艾特',
  match: (message: OneBotMessageReceive) => {
    // 私聊消息直接通过
    if (message.message_type === 'private') {
      logger.info("privateMsg", message.message);
      return true
    }

    // 群聊消息需要 @ 机器人或者 @ 全体
    if (message.message_type === 'group') {
      const me = factory.getBeanValue<string>('me')
      const msgList = message.message || []
      const isAtMe = msgList.some(item => item.type === 'at' && String(item.data?.qq) === String(me))
      const isAtAll = msgList.some(item => item.type === 'at' && item.data?.qq === 'all')

      if (isAtMe || isAtAll) {
        return true
      }
      return false
    }

    // 其他类型消息默认不处理
    return false
  },
  description: '只允许 @ 机器人或私聊的消息通过'
}

const fac = FilterFactory.getInstance()
fac.registry(toMeFilter)

export default toMeFilter
