import config from "@/bot.config";
import { createFilter } from "@/core/filter";
import { Message } from "@/interface/messageReceiveType";

export default createFilter({
  name: '艾特',
  match: (message: Message) => {
    // 私聊消息直接通过
    if (message.message_type === 'private') {
      console.log("privateMsg",message.message);
      
      return false
    }
    
    // 群聊消息需要 @ 机器人或者 @ 全体
    if (message.message_type === 'group') {
      const msgList = message.message || []
      const isAtMe = msgList.some(item => item.type === 'at' && String(item.data?.qq) === String(config.me))
      const isAtAll = msgList.some(item => item.type === 'at' && item.data?.qq === 'all')
      
      if (isAtMe || isAtAll) {
        return true
      }
      return false
    }

    // 其他类型消息默认不处理（或者根据需求放行）
    return false
  },
  description: '只允许 @ 机器人或私聊的消息通过'
})
