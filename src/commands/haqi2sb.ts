import { chatWithAI } from "@/api/ai";
import config from "@/bot.config";
import { createCommand } from "@/core/command";
import { Session } from "@/core/session";
import { MessageItemType, MessageSendType } from "@/interface/MessageSendType";
import { getRandomImage } from "@/utils/message";



export default createCommand({
  name: '对某人哈气',
  match: (session) => {
    const reg = /[对|向].*哈气/
    return reg.test(session.textContent)
  },
  handle: async (session) => {
    // const 
    let haList = []
    const reg = /[对向](.+?)哈气/;
    const match = session.textContent.match(reg);
    const groupMembers = config.group.listen
      .find(item => item.group_id == session.raw.group_id.toString())
      ?.members?.map(item => {
        if (item.nickname !== '') {
          return item?.nickname
        } else {
          return item?.card
        }
      })
    if (match) {
      const target = match[1];
      const targetIndex = groupMembers.findIndex(item => item.includes(target))
      if (targetIndex) {
        haList = [
          targetIndex
        ]
      }
    } else {
      const res = await chatWithAI(session) as any
      haList = res?.choices[0]?.message?.content?.split(',').map(item => {
        const index = Number(item?.trim())
        return index
      }).filter(item => !isNaN(item))
    }

    console.log("哈气列表", haList);

    if (!haList) return
    const msg = {} as MessageSendType
    msg.group_id = session.groupId.toString()
    const members = config.group.listen.find(item => item.group_id == msg.group_id).members

    msg.message = haList.map(index => {
      const item = { type: 'at', data: {} } as MessageItemType
      item.data.qq = members?.[index]?.user_id || ''
      return item
    })
    if (!msg?.message?.length) {
      return
    }
    msg.message.push(getRandomImage())

    await session.sendMessage(msg)
  },
  description: '对某人哈气',
})