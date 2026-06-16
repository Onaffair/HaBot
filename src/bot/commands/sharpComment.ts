import OneBot from "@/api";
import { makeSharpCommentsByAI } from "@/api/ai/llm";
import { getAITTS } from "@/api/ai/tts";
import { Command, CommandFactory } from "@/core/command";
import { MessageItemType } from "@/interface/MessageSendType";
import { getRandomBool } from "@/utils/common";
import { judgeIsAtMe, makeReplyMsg, makeTextMsg, makeVoiceMsg } from "@/utils/message";

const sharpCommentCmd: Command = {
  name: '锐评',
  match: (session) => judgeIsAtMe(session) && session.textContent.includes('锐评一下'),
  handle: async (session) => {
    const resp = await OneBot.getGroupMsgHistory({ group_id: session.groupId, count: 100 }).catch(() => ({ data: { messages: [] } }));
    const { messages: historyMessages } = resp?.data ?? { messages: [] };
    const replyId = session.message.find((item) => item?.data?.id);
    const targetMsg = historyMessages.find((item) => item.message_id == replyId?.data?.id);
    if (!targetMsg || !replyId) return;
    let res = await makeSharpCommentsByAI(targetMsg.message);
    if (!res.trim()) return;
    // if (getRandomBool()) {
      const audioBuffer = await getAITTS(res)
      const base64Audio = `base64://${audioBuffer.toString('base64')}`
      return { type: 'message', items: [makeVoiceMsg(base64Audio)] };
    // } else {
      // return [makeReplyMsg(replyId.data.id as string), makeTextMsg(res)];
    // }
  },
  description: '@耄耋+锐评一下 可以让耄耋评价引用的内容',
}

const fac = CommandFactory.getInstance()
fac.registry(sharpCommentCmd)
