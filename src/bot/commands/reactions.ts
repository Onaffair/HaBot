import { Command, CommandFactory } from "@/core/command";
import { makeAtMsg, makeRandomResource, makeTextMsg } from "@/utils/message";
import { createLogger } from "@utils/logger";
import { genshinArr, mcArr, starTrailArr, yysArr } from "@/config";

const logger = createLogger('Reactions');

// ========== 工厂函数 ==========

/** 创建关键词触发图片命令 */
function createGameReaction(
  name: string,
  description: string,
  keywords: string[],
  resourceName: string,
): Command {
  const cmd: Command = {
    name,
    description,
    match: (session) => keywords.some((k) => session.textContent.includes(k)),
    handle: async () => {
      const img = makeRandomResource(resourceName);
      if (!img) return;
      logger.info(`[${name}] Sending image: ${img.data.file}`);
      return [img];
    },
  };
  CommandFactory.getInstance().registry(cmd);
  return cmd;
}

// ========== 游戏反应命令 ==========

const genshinCmd = createGameReaction('genshin', '原神', genshinArr, '原神');


const mcCmd = createGameReaction('mc', '鸣潮', mcArr, 'mc');


const yysCmd = createGameReaction('yys', '阴阳师', yysArr, 'yys');


const starTrailCmd = createGameReaction('星铁', '星铁', starTrailArr, '星铁');


// ========== 哈气命令 ==========

const haqiCmd: Command = {
  name: '哈气',
  description: '随机获取一张哈气图片',
  priority: 9,
  match: (session) => session.textContent === '哈气',
  handle: async () => {
    const img = makeRandomResource('cat');
    if (!img) return;
    logger.info(`[哈气] Sending image: ${img.data.file}`);
    return [img];
  },
};
const haqiFac = CommandFactory.getInstance();
haqiFac.registry(haqiCmd);


// ========== 哈个气命令 ==========

const haqiVoiceCmd: Command = {
  name: '哈个气',
  description: '发送"哈个气"可以让耄耋语音哈气',
  match: (session) => session.textContent === '哈个气',
  handle: async () => {
    const voice = makeRandomResource('cat_voice');
    if (!voice) return;
    return [voice];
  },
};
const haqiVoiceFac = CommandFactory.getInstance();
haqiVoiceFac.registry(haqiVoiceCmd);


// ========== 应激命令 ==========

const yinjiCmd: Command = {
  name: '应激',
  description: '发送的内容中带有"哈气"时会使耄耋应激',
  priority: 0,
  match: (session) => session.textContent.includes('哈气'),
  handle: async (session) => {
    const img = makeRandomResource('stress');
    if (!img) return;
    const sender = session.userId;
    return [
      makeAtMsg(sender),
      makeTextMsg('\n你刚才提到了哈气？\n还有什么比哈气更有意思的事情吗？'),
      img,
    ];
  },
};
const yinjiFac = CommandFactory.getInstance();
yinjiFac.registry(yinjiCmd);


// ========== 你不是我兄弟命令 ==========
const notMyBrotherCmd: Command = {
  name: '你不是我兄弟',
  description: '你不是我兄弟',
  match: (session) => "不是兄弟".split("").every(t => session.textContent.includes(t)),
  handle: async () => {
    return [makeRandomResource('other', '你不是我兄弟')];
  },
};
const notMyBrotherFac = CommandFactory.getInstance();
notMyBrotherFac.registry(notMyBrotherCmd)