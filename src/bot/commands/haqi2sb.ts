import { findTargetPersonByAI } from "@/api/ai/llm";
import { BeanFactory } from '@/core/bean';
import { Command, CommandFactory } from "@/core/command";
import { MessageItemType } from "@/interface/MessageSendType";
import { makeRandomResource } from "@/utils/message";
import { createLogger } from '@utils/logger'
import type { GroupConfig } from '@/beans/group.bean';

const factory = BeanFactory.getInstance()
const logger = createLogger('HaQiToSB')

const haqiCmd: Command = {
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
    const targetArr = groupMembers.filter(item => matchedArr.includes(item)).map(item => groupMembers.indexOf(item))
    console.log("regTarget", targetArr);
    if (targetArr.length > 0) {
      haList = targetArr
    } else {
      const res = await findTargetPersonByAI(session) as any
      console.log("aiRes", res);
      haList = res.split(',').map(item => {
        const index = Number(item?.trim())
        return index
      }).filter(item => !isNaN(item))
      logger.info("aiTarget", haList);
    }
    logger.info("哈气列表", haList);
    if (!haList || haList.length === 0) return
    const group = factory.getBeanValue<GroupConfig>('group')
    const members = group?.listen?.find(item => item.group_id == session.groupId?.toString())?.members
    const atItems = haList.map(index => {
      const item = { type: 'at' as const, data: {} } as MessageItemType
      item.data.qq = members?.[index]?.user_id || ''
      return item
    }).filter(item => item.data.qq)
    if (!atItems.length) return
    return [...atItems, makeRandomResource('cat')]
  },
  description: '对某人哈气',
  priority: 10
}
const fac = CommandFactory.getInstance()
fac.registry(haqiCmd)
