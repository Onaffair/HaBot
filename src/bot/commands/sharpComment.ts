import { getGroupMessage } from "@/api";
import { makeSharpCommentsByAI } from "@/api/ai/llm";
import { Command, CommandFactory } from "@/core/command";
import { judgeIsAtMe, makeReplyMsg, makeTextMsg } from "@/utils/message";

const sharpCommentCmd: Command = {
  name: '锐评',
  match: (session) => judgeIsAtMe(session) && session.textContent.includes('锐评一下'),
  handle: async (session) => {
    const { messages: historyMessages } = await getGroupMessage(session.groupId).catch(() => ({ messages: [] }));
    const replyId = session.message.find((item) => item?.data?.id);
    const targetMsg = historyMessages.find((item) => item.message_id == replyId?.data?.id);
    if (!targetMsg || !replyId) return;
    let res = await makeSharpCommentsByAI(targetMsg.message);
    if (!res.trim()) return;
    return [makeReplyMsg(replyId.data.id as string), makeTextMsg(res)];
  },
  description: '@耄耋+锐评一下 可以让耄耋评价引用的内容',
}

const fac = CommandFactory.getInstance()
fac.registry(sharpCommentCmd)


