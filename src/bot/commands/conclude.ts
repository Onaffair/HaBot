import { getGroupMessage, getMessageById } from "@/api";
import { makeConclutionByAI } from "@/api/ai/LLM";
import { createCommand } from "@/core/command";
import { judgeIsAtMe, makeReplyMsg, makeTextMsg } from "@/utils/message";

export default createCommand({
  name: '总结',
  match: (session) => {
    if (judgeIsAtMe(session) && session.textContent.includes('总结一下')) {
      return true
    }
    return false
  },
  handle: async (session) => {
    const replyMessage = session.message.find(item => item?.data?.id)
    const targetMsg = await getMessageById(replyMessage?.data?.id as number).then(res => res?.data) as any

    if (!targetMsg || !replyMessage) return
    let res = await makeConclutionByAI(targetMsg?.message) as string
    if (!res.trim()) return
    res = res.replace(/[<|begin_of_box|> | <|end_of_box|>]/g, "").trim()
    return [makeReplyMsg(replyMessage?.data?.id as string), makeTextMsg(res)]
  },
  description: '@耄耋+总结一下 可以让耄耋总结概括引用的内容'
})