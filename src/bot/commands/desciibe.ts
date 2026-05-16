import { getMessageById } from "@/api";
import { generateImageByAI } from "@/api/ai/IMAGE_GENERATE";
import { makeConclutionByAI } from "@/api/ai/LLM";
import { createCommand } from "@/core/command";
import { Session } from "@/interface/session";
import { judgeIsAtMe, makeImageMsg, makeReplyMsg } from "@/utils/message";


export default createCommand({
  name: '描述',
  match: (session: Session) => {
    if (judgeIsAtMe(session) && session.textContent.includes('描述一下')) {
      return true
    }
    return false
  },
  handle: async (session) => {
    const replyMessage = session.message.find(item => item?.data?.id)
    const targetMsg = await getMessageById(replyMessage?.data?.id as number).then(res => res?.data) as any

    if (!targetMsg || !replyMessage) return
    const summary = await makeConclutionByAI(targetMsg?.message, { prompt: '请你分别描述输入文中除了文本以外的内容表达的信息' })
    let res = await generateImageByAI(targetMsg?.messages, { summary })
    return [makeReplyMsg(replyMessage?.data?.id as string), makeImageMsg(res.url)]
  },
  description: '@耄耋+描述一下 可以让耄耋描述引用的内容'
})