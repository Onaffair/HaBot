import { findTargetPersonByAI } from "@/api/ai";
import config from "@/bot.config";
import { createCommand } from "@/core/command";
import { Session } from "@/interface/session";
import { getMessageSendTypeInstance, MessageItemType, MessageSendType } from "@/interface/MessageSendType";
import { makeRandomImage } from "@/utils/message";



export default createCommand({
  name: '对/向**哈气',
  match: (session) => {
    const reg = /[对|向].*哈气/
    return reg.test(session.textContent)
  },
  handle: async (session) => {
    // const 
    let haList = []
    const reg = /[对向](.+?)哈气/;
    const match = session.textContent.match(reg);
    const groupMembers = session.groupMemberNames
    const matched = match[1];
    const matchedArr = matched.split(/[,，和与]/g)

    const targetArr = groupMembers.filter(item => matchedArr.includes(item))
    if (targetArr.length >= 0) {
      haList = targetArr
    } else {
      const res = await findTargetPersonByAI(session) as any
      haList = res.split(',').map(item => {
        const index = Number(item?.trim())
        return index
      }).filter(item => !isNaN(item))
      console.log("aiIndex", haList);
    }
    console.log("哈气列表", haList);

    if (!haList) return
    const msg = getMessageSendTypeInstance(session)
    const members = config.group.listen.find(item => item.group_id == msg.group_id).members

    msg.message = haList.map(index => {
      const item = { type: 'at', data: {} } as MessageItemType
      item.data.qq = members?.[index]?.user_id || ''
      return item
    })
    if (!msg?.message?.length) {
      return
    }
    msg.message.push(makeRandomImage())

    await session.sendMessage(msg)
  },
  description: '对某人哈气',
  priority: 10
})