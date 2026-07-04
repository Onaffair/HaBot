import { BeanFactory } from "@/core/bean";
import { Filter, FilterFactory } from "@/core/filter";
import { MessageTypeEnum } from "@/enums/MessageTypeEnum";
import { OneBotMessageReceive } from "@/interface/onebot";
import { createLogger } from '@utils/logger'
import type { GroupConfig } from '@/beans/group';

const factory = BeanFactory.getInstance()
const logger = createLogger('TargetGroupFilter')

const targetGroupFilter: Filter = {
  name: '群组',
  match: (message: OneBotMessageReceive) => {
    // 如果不是群组消息，不进行此过滤器的校验（放行）
    if (message?.message_type !== MessageTypeEnum.GROUP) {
      return false
    }
    const { group_id } = message
    // 检查群号是否在白名单中
    const group = factory.getBeanValue<GroupConfig>('group')
    const isAllowed = group?.listen?.some(item => item.group_id?.toString() === group_id?.toString())
    if (group_id && isAllowed) {
      return true
    }

    return false
  },
  description: '从群组列表中发送过来的消息'
}

const fac = FilterFactory.getInstance()
fac.registry(targetGroupFilter)

export default targetGroupFilter
