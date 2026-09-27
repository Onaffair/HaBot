import { Filter } from "@/core/filter";
import { OneBotMessageReceive } from "@/interface/onebot";
import { traceGroupMessage } from "@/utils/groupMessageTrace";

/**
 * 群消息轨迹记录过滤器：始终放行，仅负责为每条进入命令层的群消息刷新轨迹。
 *
 * 必须注册在过滤器链的最后，确保只有通过了所有其它过滤器（即真正会被命令层
 * 处理）的消息才被记录，从而让 +1 的「上一条消息」判断不失真。
 */
export const groupMessageTraceFilter: Filter = {
  name: '群消息轨迹',
  match: (message: OneBotMessageReceive) => {
    if (message?.message_type === 'group' && message.group_id != null) {
      traceGroupMessage(message.group_id, message.message)
    }
    return true
  },
  description: '记录群消息轨迹，供 +1 判断连续消息（始终放行）',
}
