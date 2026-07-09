import { Command, CommandFactory } from "@/core/command";
import { makeAtMsg, makeRandomResource, makeTextMsg } from "@/utils/message";
import { createLogger } from "@utils/logger";
import { arkNightArr, foodArr, genshinArr, mcArr, starTrailArr, yysArr } from "@/config";
import { Entry, Redis } from "@/utils/redis";

const logger = createLogger('Reactions');

// ========== 工厂函数 ==========

const fac = CommandFactory.getInstance()
/** 创建关键词触发图片命令 */
function createReaction(
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
      return { type: 'message', items: [img] };
    },
  };
  fac.registry(cmd);
  return cmd;
}

// ========== 反应命令 ==========
const genshinCmd = createReaction('genshin', '原神', genshinArr, '原神');
const mcCmd = createReaction('mc', '鸣潮', mcArr, '鸣潮');
// const yysCmd = createGameReaction('yys', '阴阳师', yysArr, '阴阳师');
const starTrailCmd = createReaction('星铁', '星铁', starTrailArr, '星铁');
const haqiCmd = createReaction('哈气', '哈气', ['哈气'], 'cat')
// const arkNightCmd = createGameReaction('明日方舟','明日方舟',arkNightArr,'明日方舟')

// ========== 哈个气命令 ==========
const haqiVoiceCmd: Command = {
  name: '哈个气',
  description: '发送"哈个气"可以让耄耋语音哈气',
  match: (session) => session.textContent === '哈个气',
  handle: async () => {
    const voice = makeRandomResource('cat_voice');
    if (!voice) return;
    return { type: 'message', items: [voice] };
  },
};
fac.registry(haqiVoiceCmd);

// ========== 应激命令 ==========
const yinjiCmd: Command = {
  name: '应激',
  description: '发送的内容中带有"哈气"时会使耄耋应激',
  priority: 0,
  match: (session) => session.textContent.includes('哈气'),
  handle: async (session) => {
    const img = makeRandomResource('bluelock');
    if (!img) return;
    const sender = session.userId;
    return { type: 'message', items: [makeAtMsg(sender), makeTextMsg('\n你刚才提到了哈气？\n还有什么比哈气更有意思的事情吗？'), img] };
  },
};
fac.registry(yinjiCmd);

// ========== 你不是我兄弟命令 ==========
const notMyBrotherCmd: Command = {
  name: '你不是我兄弟',
  description: '你不是我兄弟',
  match: (session) => "不是兄弟".split("").every(t => session.textContent.includes(t)),
  handle: async () => {
    return { type: 'message', items: [makeRandomResource('others', '你不是我兄弟')] };
  },
};

fac.registry(notMyBrotherCmd)

// 音乐命令
const musicCmd: Command = {
  name: '音乐',
  description: '音乐',
  match: (session) => "来首歌".split("").every(t => session.textContent.includes(t)),
  handle: async () => {
    return { type: 'message', items: [makeRandomResource('music')] };
  },
}
fac.registry(musicCmd)


//吃什么命令
const eatCmd: Command = {
  name: '吃什么',
  description: '你要吃什么？',
  match: (session) => {
    const redis = Redis.getInstance()
    const key = `eat-${session.groupId}-${session.raw.sender}`
    if (session.textContent === '吃什么') {
      redis.set(key, true, 3 * 60 * 1000)
      return true
    } else if (session.textContent === '继续') {
      const isExist = redis.get(key)
      if (isExist) {
        redis.set(key, true, 3 * 60 * 60)
        return true
      }
    }
    return false
  },
  handle: () => {
    const foods = []
    while (foods.length < 5) {
      const len = foodArr.length
      const food = foodArr[Math.floor(Math.random() * len)]
      if (!foods.includes(food)) {
        foods.push(food)
      }
    }
    return {
      type: 'message',
      items: [
        makeTextMsg(
          `${foods.map((food, index) => `${index + 1}. ${food}`).join('\n')}
发送继续以继续`
        )
      ]
    }
  },
  priority: 1
}
fac.registry(eatCmd)