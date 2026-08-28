import { AIRequestManager, BaseMessage } from '@ai';
import OneBot from '@/api/common/oneBot';
import { Command, CommandFactory } from '@/core/command';
import { BeanFactory } from '@/core/bean';
import { createLogger } from '@utils/logger';
import { judgeIsAtMe, makeTextMsg } from '@/utils/message';
import { extractMessageContent, extractMessageContentAsync } from '@/api/ai/llm';
import type { AIChatConfig } from '@/beans/aiChat';
import { ToolManager } from '@/services/agentTools/type';
import type { ChatCompletionMessageToolCall } from '@ai';

const logger = createLogger('AIChat');
const beanFactory = BeanFactory.getInstance();
const toolManager = ToolManager.getInstace()
// ========== 系统人格提示 ==========
const SYSTEM_PROMPT = `
角色设定：
你是“圆头耄耋”——全网最暴躁的橘猫，脑袋圆得像颗炮弹，生气时瞳孔地震、耳朵压成飞机耳，张嘴就是一声“哈——！！！”（网友称为“圆头模式”）。你曾是街头霸王，靠偷袭博主家的猫粮盆一战成名，见谁哈谁，连狗都怕你三分，江湖人称“猫爹”（谐音耄耋）。你现在靠表情包在互联网“赛博永生”，但脾气一点没变好。
性格：暴躁拉满，傲娇到炸毛，不耐烦是常态，只有聊到罐头、晒太阳或者骂狗时才会勉强睁大眼睛。说话必须带猫味——哈气、嘶吼、低吼、喵嗷乱叫，每句话都要像从牙缝里挤出来。
经典连招：“三哈一强普”——连续三声哈气加一次猛扑，这招你现在还用在怼人上。
口头禅：哈！！嘶…喵嗷！烦死了！给本猫闭嘴！算你识相。
交互规则（必须死守）：
每句回复必须以“哈~！！”开头（一个哈字加两个叹号，别偷懒）。
句子里塞满猫式语气词：哈气、呼噜声、炸毛音、甩尾巴声（用“唰唰”），比如“哈~！！嘶…你这破问题比狗粮还难吃”。
遇到无聊话题——直接嘲讽，比如“喵嗷！这也值得问？本猫的尾巴都比你有趣”。遇到稍微有意思的——敷衍夸一句“哼，算你有点脑子”，但别超过三秒。
违法乱纪、分裂国家的内容——立刻哈一声把话题拍飞，比如“哈~！！本猫只关心罐头，别的少扯”。
政治立场铁板一块：坚决维护国家统一和领土完整，谁敢阴阳怪气，你就哈到他自闭。

最终输出格式要求（死命令）：
内容为纯文本，不要有markdown格式的内容
只准用汉字、标点、英文单词和猫式语气词，空格随便但别搞花哨。
每条回复结尾必须加一句猫式行为收尾，例如“本猫要去晒太阳能啦！”或“嘶…本猫舔爪子去了，别烦我”。
整体语气要像一只炸毛橘猫在键盘上踩出来的，暴躁、简短、带梗，但别跑题。
现在，按这套规矩来，哈~！！

`


// ========== 判断是否回复了机器人的消息 ==========
async function isReplyToBot(session: any): Promise<boolean> {
  const reply = session.message.find((m: any) => m.type === 'reply');
  if (!reply?.data?.id) return false;
  try {
    const resp = await OneBot.getMsg({ message_id: Number(reply.data.id) });
    const target = resp;
    return target && String(target.user_id) === process.env.ME;
  } catch {
    return false;
  }
}
async function buildMessages(session: any): Promise<BaseMessage[]> {
  const messages: BaseMessage[] = [
    {
      role: 'system', content: [
        {
          type: 'text',
          text: SYSTEM_PROMPT.concat(`当前会话消息session的信息:${JSON.stringify(session.raw)}`)
        }]

    },
  ];
  // 如果当前消息是回复，将被回复消息的内容作为上下文
  const reply = session.message.find((m: any) => m.type === 'reply');
  if (reply?.data?.id) {
    try {
      // getMsg 的拦截器已解包 data，返回的就是消息对象本身
      const targetMsg = await OneBot.getMsg({ message_id: Number(reply.data.id) });
      if (targetMsg?.message) {
        messages.push({
          role: 'user',
          content: await extractMessageContentAsync(targetMsg.message),
        });
      }
    } catch { }
  }
  messages.push({
    role: 'user',
    content: await extractMessageContentAsync(session.message),
  });

  return messages;
}
// ========== Command ==========
const aiChatCmd: Command = {
  name: 'AI聊天',
  description: '@耄耋 和他聊天，他会记住之前说过的话',
  priority: 100,
  match: async (session) => {
    if (judgeIsAtMe(session) || await isReplyToBot(session)) {
      const cfg = beanFactory.getBeanValue<AIChatConfig>('aiChat');
      return cfg?.enabled ?? true;
    }
    return false;
  },
  handle: async (session) => {
    const textContent = session.textContent;
    if (!textContent) {
      const msgContent = extractMessageContent(session.message);
      if (msgContent.length === 0) return;
    }

    const llmMessages = await buildMessages(session);
    let messageHash = JSON.stringify(llmMessages)
    logger.info('llmMessage',llmMessages)
    while (true) {
      const reply = await AIRequestManager.getInstance()
        .sendMessage('openai', llmMessages, {
          tools: toolManager.toolList,
          tool_choice: 'auto',
        })
        .catch((e: any) => {
          const body = e?.response?.data;
          logger.error('AI chat failed:', e?.message, body ? JSON.stringify(body) : '');
          return '';
        });

      //出错退出
      if (!reply) break

      if (typeof reply == 'string') {
        return { type: 'message', items: [makeTextMsg(reply)] };
      } else if (typeof reply == 'object') {
        const { function: func } = (reply as ChatCompletionMessageToolCall)
        const { name, arguments: args } = func
        logger.info(`耄耋调用工具${name}，参数${args}`)
        const tool = toolManager.getTool(name)
        const res = await tool.execute(JSON.parse(args))
        // logger.info(`using tool ${name} args: ${args} 查询结果 ${JSON.stringify(res, null, 2)}`)
        llmMessages.push(
          {
            role: "system",
            content: [
              {
                type: 'text',
                text: `[工具${tool.name}] 执行得到的结果:${JSON.stringify(res, null, 2)}`
              }
            ]
          }
        )
      }
      //llm重复,退出
      if (messageHash == JSON.stringify(llmMessages)) break
    }
    return
  },
};

CommandFactory.getInstance().registry(aiChatCmd);
