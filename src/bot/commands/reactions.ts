import { Command, createCommand } from "@/core/command";
import { makeAtMsg, makeRandomImage, makeTextMsg, makeRandomVoice } from "@/utils/message";
import { createLogger } from "@utils/logger";
import config from '@config';
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
  return createCommand({
    name,
    description,
    match: (session) => keywords.some((k) => session.textContent.includes(k)),
    handle: async () => {
      const img = makeRandomImage(resourceName);
      if (!img) return;
      logger.info(`[${name}] Sending image: ${img.data.file}`);
      return [img];
    },
  });
}

// ========== 命令列表 ==========

const strategies: Command[] = [
  createGameReaction('genshin', '原神', genshinArr, '原神'),
  createGameReaction('mc', '鸣潮', mcArr, 'mc'),
  createGameReaction('yys', '阴阳师', yysArr, 'yys'),
  createGameReaction('星铁', '星铁', starTrailArr, '星铁'),

  createCommand({
    name: '哈气',
    description: '随机获取一张哈气图片',
    priority: 9,
    match: (session) => {
      return session.textContent === '哈气'
    },
    handle: async () => {
      const img = makeRandomImage();
      if (!img) return;
      logger.info(`[哈气] Sending image: ${img.data.file}`);
      return [img];
    },
  }),

  createCommand({
    name: '哈个气',
    description: '发送"哈个气"可以让耄耋语音哈气',
    match: (session) => session.textContent === '哈个气',
    handle: async () => {
      const voice = makeRandomVoice();
      if (!voice) return;
      return [voice];
    },
  }),

  createCommand({
    name: '应激',
    description: '发送的内容中带有"哈气"时会使耄耋应激',
    priority: 0,
    match: (session) => session.textContent.includes('哈气'),
    handle: async (session) => {
      const img = makeRandomImage('stress');
      if (!img) return;
      const sender = session.userId;
      return [
        makeAtMsg(sender),
        makeTextMsg('\n你刚才提到了哈气？\n还有什么比哈气更有意思的事情吗？'),
        img,
      ];
    },
  }),

  createCommand({
    name: 'KeywordReaction',
    description: '关键词触发资源图片',
    match: (session) =>
      config.resource?.folder?.some((f) => session.textContent.includes(f.name)) ?? false,
    handle: async (session) => {
      const folder = config.resource.folder.find((f) => session.textContent.includes(f.name));
      if (!folder) return;
      const img = makeRandomImage(folder.name);
      if (!img) return;
      logger.info(`[KeywordReaction] Sending image for ${folder.name}: ${img.data.file}`);
      return [img];
    },
  }),
];

export default strategies;
