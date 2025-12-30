import config from "@/bot.config";
import { createFilter } from "@/core/filter";
import { MessageType } from "@/enums/MessageType";
import { Message } from "@/interface/messageReceiveType";


export default createFilter({
  name: '群组',
  match: (message: Message) => {
    // 如果不是群组消息，不进行此过滤器的校验（放行）
    if (message?.message_type !== MessageType.GROUP) {
      return false
    }
    const { group_id } = message
    // 检查群号是否在白名单中
    // 适配新的 config.group.listen 结构（对象数组）
    const isAllowed = config.group.listen.some(item => item.group_id === group_id?.toString())

    if (group_id && isAllowed) {
      // console.log(`[Filter] Message from allowed group: ${group_id}`);
      return true
    }

    return false
  },
  description: '从群组列表中发送过来的消息'
})