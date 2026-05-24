import { getGroupMessage, getMessageById } from "@/api";
import { makeConclutionByAI } from "@/api/ai/LLM";
import { createCommand } from "@/core/command";
import { judgeIsAtMe, makeReplyMsg, makeTextMsg } from "@/utils/message";

const BOX_TAG_RE = /[<|]begin_of_box[>|]|[<|]end_of_box[>|]/g;

export default createCommand({
  name: '总结',
  match: (session) => judgeIsAtMe(session) && session.textContent.includes('总结一下'),
  handle: async (session) => {
    const replyMessage = session.message.find((item) => item?.data?.id);
    if (!replyMessage) return;

    const targetMsg = await getMessageById(replyMessage.data.id as number);
    if (!targetMsg?.message) return;

    let res = await makeConclutionByAI(targetMsg.message);
    if (!res.trim()) return;
    res = res.replace(BOX_TAG_RE, '').trim();
    return [makeReplyMsg(replyMessage.data.id as string), makeTextMsg(res)];
  },
  description: '@耄耋+总结一下 可以让耄耋总结概括引用的内容',
});
