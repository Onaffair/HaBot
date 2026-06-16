import OneBot from "@/api";
import { makeConclutionByAI } from "@/api/ai/llm";
import { Command, CommandFactory } from "@/core/command";
import { judgeIsAtMe, makeReplyMsg, makeTextMsg } from "@/utils/message";


const concludeCmd: Command = {
  name: '总结',
  match: (session) => judgeIsAtMe(session) && session.textContent.includes('总结一下'),
  handle: async (session) => {
    const replyMessage = session.message.find((item) => item?.data?.id);
    if (!replyMessage) return;

    const resp = await OneBot.getMsg({ message_id: replyMessage.data.id as number });
    const targetMsg = resp?.data;
    if (!targetMsg?.message) return;

    let res = await makeConclutionByAI(targetMsg.message);
    if (!res.trim()) return;
    return { type: 'message', items: [makeReplyMsg(replyMessage.data.id as string), makeTextMsg(res)] };
  },
  description: '@耄耋+总结一下 可以让耄耋总结概括引用的内容',

}
const fac = CommandFactory.getInstance()
fac.registry(concludeCmd)
