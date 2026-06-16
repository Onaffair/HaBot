import OneBot from "@/api";
import { generateImageByAI } from "@/api/ai/image";
import { makeConclutionByAI } from "@/api/ai/llm";
import { Command, CommandFactory } from "@/core/command";
import { judgeIsAtMe, makeImageMsg, makeReplyMsg } from "@/utils/message";



const describeCommand:Command = {

  name: '描述',
  match: (session) => judgeIsAtMe(session) && session.textContent.includes('描述一下'),
  handle: async (session) => {
    const replyMessage = session.message.find((item) => item?.data?.id);
    if (!replyMessage) return;

    const resp = await OneBot.getMsg({ message_id: replyMessage.data.id as number });
    const targetMsg = resp?.data;
    if (!targetMsg?.message) return;

    const summary = await makeConclutionByAI(targetMsg.message, {
      prompt: '请你分别描述输入文中除了文本以外的内容表达的信息',
    });
    const img = await generateImageByAI(targetMsg.messages ?? targetMsg.message, { summary });
    return { type: 'message', items: [makeReplyMsg(replyMessage.data.id as string), makeImageMsg(img.url)] };
  },
  description: '@耄耋+描述一下 可以让耄耋描述引用的内容',

}
const fac = CommandFactory.getInstance()
fac.registry(describeCommand)
