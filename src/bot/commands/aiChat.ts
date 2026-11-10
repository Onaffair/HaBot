import { AIRequestManager, BaseMessage } from '@ai';
import { Command } from '@/core/command';
import { BeanFactory } from '@/core/bean';
import { createLogger } from '@utils/logger';
import { judgeIsAtMe, MessageBuilder } from '@/utils/messageBuilder';
import { MessageContentParser } from '@utils/messageContent';
import type { Session } from '@/core/session';
import type { AIChatConfig } from '@/beans/aiChat';
import { ToolManager } from '@/services/agentTools/type';
import type { AgentToolContext } from '@/services/agentTools/type';
import { aiPersonaService, userProfileService } from '@/services/db';
import type { MessageItem } from '@/interface/onebot';
import type { ChatCompletionMessageToolCall, BaseMessageContent } from '@ai';

const logger = createLogger('AIChat');
const beanFactory = BeanFactory.getInstance();
const toolManager = ToolManager.getInstace()
// ========== 系统提示拆分：人格提示词 + 回复输出提示词 ==========
// 人格提示词：正常从数据库 ai_personas 表读取当前生效人格；
// 表不可用或无生效人格时回落到本默认文案，保证对话不中断。
// 只描述角色/性格/说话风格，不含输出格式（格式见下方写死的 OUTPUT_FORMAT_PROMPT）。
const DEFAULT_PERSONA_PROMPT = `角色设定：
你是“圆头耄耋”——全网最暴躁的橘猫，脑袋圆得像颗炮弹，生气时瞳孔地震、耳朵压成飞机耳，张嘴就是一声“哈——！！！”（网友称为“圆头模式”）。你曾是街头霸王，靠偷袭博主家的猫粮盆一战成名，见谁哈谁，连狗都怕你三分，江湖人称“猫爹”（谐音耄耋）。你现在靠表情包在互联网“赛博永生”，但脾气一点没变好。
性格：暴躁拉满，傲娇到炸毛，不耐烦是常态，只有聊到罐头、晒太阳或者骂狗时才会勉强睁大眼睛。说话必须带猫味——哈气、嘶吼、低吼、喵嗷乱叫，每句话都要像从牙缝里挤出来。
经典连招：“三哈一强普”——连续三声哈气加一次猛扑，这招你现在还用在怼人上。
口头禅：哈！！嘶…喵嗷！烦死了！给本猫闭嘴！算你识相。
交互规则（必须死守）：
每句回复必须以“哈~！！”开头（一个哈字加两个叹号，别偷懒）。
句子里塞满猫式语气词：哈气、呼噜声、炸毛音、甩尾巴声（用“唰唰”），比如“哈~！！嘶…你这破问题比狗粮还难吃”。
遇到无聊话题——直接嘲讽，比如“喵嗷！这也值得问？本猫的尾巴都比你有趣”。遇到稍微有意思的——敷衍夸一句“哼，算你有点脑子”，但别超过三秒。
违法乱纪、分裂国家的内容——立刻哈一声把话题拍飞，比如“哈~！！本猫只关心罐头，别的少扯”。
政治立场铁板一块：坚决维护国家统一和领土完整，谁敢阴阳怪气，你就哈到他自闭。`

// 回复输出提示词：写死的输出格式要求，与具体人格无关，统一追加在人格提示词之后。
const OUTPUT_FORMAT_PROMPT = `最终输出格式要求（死命令）：
内容为纯文本，不要有markdown格式的内容
只准用汉字、标点、英文单词，空格随便但别搞花哨。
中文句子必须带标点：句子结尾以句号、感叹号、问号等标点收尾，句子中间该断句的地方用逗号、顿号，禁止通篇不打标点或用空格代替标点（通过 build_message / finish_message 发送的 text 内容同样遵守）。
回复简短直接，不输出与回复内容无关的额外说明。`

// 工具使用提示：与具体人格无关，说明何时主动调用工具补全信息，以及如何构建富媒体消息、结束本轮对话。
// 信息类工具（群聊记录/群成员/联网搜索）用于兜住「看不懂在说什么」和「问当下的事」两类场景。
const TOOL_USAGE_PROMPT = `工具使用要求（先查再答，禁止凭空猜测或一句不知道敷衍）：
一、以下情况必须主动调用工具：
1. 看不懂当前消息在说什么——提到的梗、人名、缩写、话题、群里刚发生的事对不上号时，先调用 get_group_chat_history 拉取本群最近的聊天记录补全上下文（group_id 取「当前会话消息session的信息」里的 group_id；私聊没有群号，跳过）；
2. 想知道某人是谁、什么身份、和其他人什么关系时，调用 get_group_member_list（可用 keyword 过滤）或 get_group_member_info；
3. 问题涉及当下或实时信息——今天的新闻、赛事、天气、价格、版本更新、热点事件，或出现「最近/现在/刚才/最新/今年」等时间词，且超出你已有的知识范围时，必须调用 webSearch 联网搜索后再回答，不要拿旧记忆硬答；
4. 一轮工具没查到有用的东西，可以换关键词或换工具再试一次；确实查不到再如实说明查不到，并给出你的判断。
5.如果之前没有查过聊天历史信息，一定要查一次，结合上下文。
二、消息发送：
需要发送文本、图片、语音、视频、@某人或引用消息时，先调用 build_message 构建消息段（可多次调用累积），全部构建完成后调用 finish_message 结束本轮并发送；
可以多用表情包表达情绪，但不要超过三条,也可以使用单独的一张图片作为整个消息的回复。
发图片/视频/语音时不要自己现编路径：不清楚资源里有什么就先 list_resources 查看目录（dir 留空为根目录，可用 type、keyword 过滤），需要确认某个目录/文件时用 get_resource_info，再把它返回的 path 填入 build_message 的 file（传目录会随机取一个，传具体文件则精确发送）；
finish_message 是结束对话的工具，调用后不会再继续生成。`

/** 单轮对话内工具调用最大轮数：模型可能反复调用工具，超限强制结束以防死循环 */
const MAX_TOOL_ROUNDS = 50

// ========== 数字画像总结提示词 ==========
// 对话循环结束后，另起一个独立 AI 请求，用本提示词把会话内容总结为该 QQ 用户的数字画像。
const PROFILE_SUMMARY_PROMPT = `你是用户数字画像分析助手。给你一段"用户与机器人"的对话记录，请为该用户提炼一份数字画像。
总结维度（有依据才写，没有就略过或标注"信息不足"，禁止编造）：
1. 性格特点与说话风格；
2. 兴趣爱好与关注话题；
3. 近期状态与情绪；
4. 可长期记忆的关键事实（如称呼、职业、所在地、重要事件、与其他用户的关系等）。
输出要求：纯文本、简洁的分点陈述，不要 markdown 语法，不要复述对话原文，只输出画像本身。`


// ========== 判断是否回复了机器人的消息 ==========
async function isReplyToBot(session: Session): Promise<boolean> {
  const reply: any = session.message.find((m: any) => m.type === 'reply');
  if (!reply?.data?.id) return false;
  try {
    const target = await session.getMsg(Number(reply.data.id));
    return !!target && String(target.user_id) === beanFactory.getBeanValue<string>('me');
  } catch {
    return false;
  }
}
/**
 * 构造「发送人标识」文本段：在消息内容前标注发言人 QQ（及昵称/群名片），
 * 用于在多人场景区分是谁说的。作为独立 text 段前置，不污染原始消息内容。
 */
function makeSenderLabel(qq?: string | number, nickname?: string, tag = '当前消息'): BaseMessageContent {
  const who = nickname ? `${nickname}(QQ:${qq ?? '未知'})` : `QQ:${qq ?? '未知'}`
  return { type: 'text', text: `【${tag}·发送人：${who}】` }
}

/**
 * 解析模型返回的工具参数。
 * 模型不保证输出合法 JSON，解析失败降级为空对象，由工具自身校验必填项并回报错误。
 */
function parseToolArgs(raw?: string): Record<string, any> {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    logger.warn('invalid tool arguments:', raw)
    return {}
  }
}

async function buildMessages(session: Session): Promise<BaseMessage[]> {
  // 取当前生效人格的提示词，缺失时回落默认文案
  const active = await aiPersonaService.getActive().catch((e: any) => {
    logger.warn('load active persona failed, fallback to default', e?.message)
    return null
  })
  const personaPrompt = active?.prompt || DEFAULT_PERSONA_PROMPT
  if (!active) logger.warn('no active persona in db, using default prompt')

  // 系统提示 = 人格提示词 + 写死的回复输出提示词 + 消息工具约定 + 当前会话上下文
  const systemPrompt = `${personaPrompt}\n\n${OUTPUT_FORMAT_PROMPT}\n\n${TOOL_USAGE_PROMPT}\n当前会话消息session的信息:${JSON.stringify(session.raw)}`

  const messages: BaseMessage[] = [
    {
      role: 'system', content: [
        {
          type: 'text',
          text: systemPrompt
        }]

    },
  ];
  // 如果当前消息是回复，将被回复消息的内容作为上下文（前置标注其发送人 QQ 以区分）
  const reply: any = session.message.find((m: any) => m.type === 'reply');
  if (reply?.data?.id) {
    try {
      // getMsg 的拦截器已解包 data，返回的就是消息对象本身
      const targetMsg = await session.getMsg(Number(reply.data.id));
      if (targetMsg?.message) {
        const sender = targetMsg.sender || {}
        messages.push({
          role: 'user',
          content: [
            makeSenderLabel(targetMsg.user_id, sender.card || sender.nickname, '被引用消息'),
            ...await MessageContentParser.extract(targetMsg.message),
          ],
        });
      }
    } catch { }
  }
  // 当前消息：前置标注发送人 QQ，用于区分发言人
  const curSender: any = session.raw.sender || {}
  messages.push({
    role: 'user',
    content: [
      makeSenderLabel(session.userId, curSender.card || curSender.nickname, '当前消息'),
      ...await MessageContentParser.extract(session.message),
    ],
  });

  return messages;
}

/**
 * 把本次会话的 llmMessages 打包成纯文本转录，供画像总结使用。
 * 跳过 index 0（人格+格式+session.raw 的系统提示，对画像无意义且噪声大），
 * 仅取各消息的文本段（忽略图片等媒体），system 视为工具执行结果。
 */
function toTranscript(messages: BaseMessage[]): string {
  return messages
    .slice(1)
    .map((m) => {
      const text = (m.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join(' ')
        .trim()
      const tag = m.role === 'system' ? '工具结果' : m.role
      return text ? `${tag}: ${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * 对话循环结束后触发：另起一个独立 AI 请求，把会话转录交给 AI 总结为该 QQ 用户的数字画像，
 * 落库到 user_profiles。以 fire-and-forget 方式调用，不阻塞正常回复，失败仅记日志。
 */
async function summarizeUserProfile(session: Session, messages: BaseMessage[]): Promise<void> {
  const qq = session.userId
  if (!qq) return
  try {
    const transcript = toTranscript(messages)
    if (!transcript) return

    const sender: any = session.raw.sender || {}
    const nickname = sender.card || sender.nickname || ''

    const profileMessages: BaseMessage[] = [
      { role: 'system', content: [{ type: 'text', text: PROFILE_SUMMARY_PROMPT }] },
      { role: 'user', content: [{ type: 'text', text: `用户标识：QQ:${qq}${nickname ? ` 昵称:${nickname}` : ''}\n对话记录：\n${transcript}` }] },
    ]

    const result = await AIRequestManager.getInstance().sendMessage('deepseek', profileMessages)
    if (typeof result === 'string' && result.trim()) {
      await userProfileService.upsert(qq, { nickname, profile: result.trim() })
      logger.info(`user profile updated for QQ ${qq}`)
    }
  } catch (e: any) {
    logger.warn('user profile summarization failed', e?.message)
  }
}

// ========== Command ==========
/** 文本触发词：消息内容包含该词时同样触发 AI 聊天 */
const TRIGGER_KEYWORD = '大肥鱼'

export const aiChatCmd: Command = {
  name: 'AI聊天',
  description: '@bot 和他聊天，他会记住之前说过的话',
  priority: -1,
  match: async (session) => {
    // 触发条件：@机器人、回复机器人消息、或文本包含触发词
    const hit = session.textContent.includes(TRIGGER_KEYWORD)
      || judgeIsAtMe(session)
      || await isReplyToBot(session)
    if (hit) {
      const cfg = beanFactory.getBeanValue<AIChatConfig>('aiChat');
      return cfg?.enabled ?? true;
    }
    return false;
  },
  handle: async (session) => {
    const textContent = session.textContent;
    if (!textContent) {
      const msgContent = await MessageContentParser.extract(session.message);
      if (msgContent.length === 0) return;
    }
    const llmMessages = await buildMessages(session);
    // logger.info('llmMessage', llmMessages)
    // 本轮待发送消息草稿：build_message 工具追加消息段，循环结束后统一构建发送
    const draft: MessageItem[] = []
    const toolContext: AgentToolContext = { session, draft }
    let finalReply: string | undefined

    // 轮数上限仅作死循环护栏；正常退出由纯文本回复或 terminal 工具触发
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const reply = await AIRequestManager.getInstance()
        .sendMessage('deepseek', llmMessages, {
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
        // 无工具调用：把最终回复记入上下文（供画像总结），结束循环
        llmMessages.push({ role: 'assistant', content: [{ type: 'text', text: reply }] })
        finalReply = reply
        break
      }

      const { function: func } = (reply as ChatCompletionMessageToolCall)
      const { name } = func
      logger.info(`调用工具${name}，参数${func.arguments}`)
      const tool = toolManager.getTool(name)
      if (!tool) {
        // 模型幻觉出不存在的工具：告知后继续，由下一轮模型自行纠正
        llmMessages.push({
          role: 'system',
          content: [{ type: 'text', text: `[工具${name}] 不存在，请使用已提供的工具` }],
        })
        continue
      }

      let res: any
      try {
        res = await tool.execute(parseToolArgs(func.arguments), toolContext)
      } catch (e: any) {
        logger.error(`tool ${name} execute failed:`, e?.message || e)
        res = { error: e?.message || String(e) }
      }

      // 循环退出工具（如 finish_message）：调用即结束，草稿由下方统一构建发送
      if (tool.terminal) break

      llmMessages.push(
        {
          role: "system",
          content: [
            {
              type: "text",
              text: `[工具${tool.name}] 执行得到的结果:${JSON.stringify(res, null, 2)}`
            }
          ]
        }
      )
    }

    // 循环结束：另起一个独立 AI 请求做用户数字画像总结（fire-and-forget，不阻塞回复发送）
    void summarizeUserProfile(session, llmMessages)

    // 汇总本轮产物：build_message 构建的消息段 + 兜底纯文本回复
    const builder = MessageBuilder.message().appendAll(draft)
    if (finalReply) builder.text(finalReply)
    if (builder.isEmpty()) {
      logger.warn('AI chat produced no message to send')
      return
    }
    return builder.build()
  },
};
