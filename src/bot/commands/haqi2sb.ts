
import { BeanFactory } from '@/core/bean';
import { Command } from "@/core/command";
import { OB11MessageAt } from "@/interface/onebot";
import { MessageBuilder } from "@/utils/message";
import { createLogger } from '@utils/logger'
import type { GroupConfig } from '@/beans/group';

const factory = BeanFactory.getInstance()
const logger = createLogger('HaQiToSB')
export const haqiCmd: Command = {
  name: '对某人哈气',
  match: (session) => {
    const reg = /[对|向].*哈气/
    return reg.test(session.textContent)
  },
  handle: async (session) => {
    let haList: number[] = []
    const reg = /[对向](.+?)哈气/;
    const match = session.textContent.match(reg);
    const groupMembers = session.groupMemberNames
    const matched = match[1];
    const matchedArr = matched.split(/[,，和与]/g)
    haList = groupMembers.filter(item => matchedArr.includes(item)).map(item => groupMembers.indexOf(item))

    logger.info("哈气列表", haList);
    if (!haList || haList.length === 0) return
    const group = factory.getBeanValue<GroupConfig>('group')
    const members = group?.listen?.find(item => item.group_id == session.groupId?.toString())?.members
    const atItems = haList.map(index => {
      const item = { type: 'at' as const, data: {} } as OB11MessageAt
      item.data.qq = members?.[index]?.user_id.toString() || ''
      return item
    }).filter(item => item.data.qq)
    if (!atItems.length) return
    // 链式拼接：逐个 @ 成员 -> 随机 cat 资源
    return MessageBuilder.message()
      .appendAll(atItems)
      .resource('cat')
      .build()
  },
  description: '对某人哈气',
  priority: 10
}
