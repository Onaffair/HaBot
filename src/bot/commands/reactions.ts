import { Command, createCommand } from "@/core/command";
import { Session } from "@/interface/session";
import { getMessageSendTypeInstance } from "@/interface/MessageSendType";
import { makeAtMsg, makeRandomImage, makeTextMsg, makeRandomVoice } from "@/utils/message";
import { createLogger } from "@utils/logger";
import config from '@config';
import { genshinArr, mcArr, starTrailArr } from "@/config";

const logger = createLogger('Reactions');


const strategies: Command[] = [
  {
    name: 'genshin',
    description: '鸣神永恒',
    match: (session) => {
      return genshinArr.some(item => session.textContent.includes(item))
    },
    handle: async (session) => {
      const msg = getMessageSendTypeInstance(session);
      const imgKey = session.textContent.includes('原神') ? '原神' : 'mc';
      const imageMsg = makeRandomImage('原神');
      if (!imageMsg) return;

      msg.message.push(imageMsg);
      logger.info(`[genshin/Mc] Sending image: ${imageMsg.data.file}`);
      await session.sendMessage(msg);
    }
  },
  {
    name: 'Mc',
    description: 'mc',
    match: (session) => {
      return mcArr.some(item => session.textContent.includes(item))
    },
    handle: async (session) => {
      const msg = getMessageSendTypeInstance(session);
      const imageMsg = makeRandomImage('mc');
      if (!imageMsg) return;
      msg.message.push(imageMsg);
      logger.info(`[genshin/Mc] Sending image: ${imageMsg.data.file}`);
      await session.sendMessage(msg);
    }
  },
  {
    name: '星铁',
    description: '星铁',
    match: (session) => {
      return starTrailArr.some(item => session.textContent.includes(item))
    },
    handle: async (session) => {
      const msg = getMessageSendTypeInstance(session);
      const imageMsg = makeRandomImage('星铁');
      if (!imageMsg) return;
      msg.message.push(imageMsg);
      logger.info(`[genshin/Mc] Sending image: ${imageMsg.data.file}`);
      await session.sendMessage(msg);
    }
  },
  {
    name: '哈气',
    description: '随机获取一张哈气图片',
    priority: 9,
    match: (session) => session.textContent === '哈气',
    handle: async (session) => {
      const msg = getMessageSendTypeInstance(session);
      const imageMsg = makeRandomImage(); // Defaults to 'cat'
      if (!imageMsg) return;

      msg.message.push(imageMsg);
      logger.info(`[哈气] Sending image: ${imageMsg.data.file}`);
      await session.sendMessage(msg);
    }
  },
  {
    name: '天籁之音',
    description: '发送‘云烟姐姐的天籁之音’可以聆听',
    match: (session) => session.textContent === '云烟姐姐的天籁之音',
    handle: async (session) => {
      const msg = getMessageSendTypeInstance(session);
      const voiceMsg = makeRandomVoice('司云烟');
      if (!voiceMsg) return;

      msg.message.push(voiceMsg);
      await session.sendMessage(msg);
    }
  },
  {
    name: '哈个气',
    description: '发送哈个气可以让耄耋语音哈气',
    match: (session) => session.textContent === '哈个气',
    handle: async (session) => {
      const msg = getMessageSendTypeInstance(session);
      const voiceMsg = makeRandomVoice(); // Defaults to 'cat_voice'
      if (!voiceMsg) return;

      msg.message.push(voiceMsg);
      await session.sendMessage(msg);
    }
  },
  {
    name: '应激',
    description: '发送的内容中带有哈气时会使耄耋应激',
    priority: 0,
    match: (session) => session.textContent.includes('哈气'),
    handle: async (session) => {
      const msg = getMessageSendTypeInstance(session);
      const imageMsg = makeRandomImage('stress');
      if (!imageMsg) return;

      const sender = session.userId;
      const atMsg = makeAtMsg(sender);
      const stressMsg = makeTextMsg(`\n你刚才提到了哈气？\n还有什么比哈气更有意思的事情吗？`);

      msg.message = [atMsg, stressMsg, imageMsg];

      logger.info(`[Stress] Sending image: ${imageMsg.data.file}`);
      await session.sendMessage(msg);
    }
  },
  {
    name: 'KeywordReaction',
    description: '关键词触发资源图片',
    match: (session) => {
      return config.resource?.folder?.some(f => session.textContent.includes(f.name)) ?? false
    },
    handle: async (session) => {
      const msg = getMessageSendTypeInstance(session);
      const folder = config.resource.folder.find(f => session.textContent.includes(f.name));
      if (!folder) return;

      const imageMsg = makeRandomImage(folder.name);
      if (!imageMsg) return;

      msg.message.push(imageMsg);
      logger.info(`[KeywordReaction] Sending image for ${folder.name}: ${imageMsg.data.file}`);
      await session.sendMessage(msg);
    }
  }
];

export default strategies.map(s => createCommand({
  name: s.name,
  description: s.description,
  priority: s.priority,
  match: s.match,
  handle: s.handle
}));
