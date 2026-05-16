import { getGroupMessage } from "@/api";
import { makeSharpCommentsByAI } from "@/api/ai/LLM";
import { createCommand } from "@/core/command";
import { judgeIsAtMe, makeReplyMsg, makeTextMsg } from "@/utils/message";

export default createCommand({
  name: '锐评',
  match: (session) => {
    if (judgeIsAtMe(session) && session.textContent.includes('锐评一下')) {
      return true
    }
    return false
  },
  handle: async (session) => {
    const historyMessage = await getGroupMessage(session.groupId).then(res => res?.data?.messages || [])
    const replyId = session.message.find(item => item?.data?.id)
    const targetMsg = historyMessage.find(item => item.message_id == replyId?.data?.id)
    if (!targetMsg || !replyId) return
    
    let res = await makeSharpCommentsByAI(targetMsg.message) as string

    if (!res.trim()) return
    res = res.replace(/[<|begin_of_box|> | <|end_of_box|>]/g, "").trim()
    return [makeReplyMsg(replyId?.data?.id as string), makeTextMsg(res)]
  },
  description: '@耄耋+锐评一下 可以让耄耋评价引用的内容'
})