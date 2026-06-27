import { AIRequestManager, BaseMessage } from '@/services/ai';
import { BeanFactory } from '@/core/bean';
import { Schedule, ScheduleFactory } from '@/core/schedule';
import { createLogger } from '@utils/logger';
import { chatMemoryService } from '@/utils/chatMemory';
import type { GroupConfig } from '@/beans/group';

const logger = createLogger('CompressMemory');

const COMPRESS_PROMPT = [
  '以下是群聊中和机器人"耄耋"的对话记录（按时间先后排列）。',
  '请用200字以内概括讨论的关键话题和对话走向，保留重要的事实信息、人物关系和对话背景。',
  '关注持续出现的主题和关键内容，不要遗漏重要信息。',
  '只输出摘要本身，不要加任何前缀后缀。',
].join('\n');

const compressMemorySchedule: Schedule = {
  name: '记忆压缩',
  description: '定期压缩长期对话记忆，保存摘要',
  delay: 30 * 60 * 1000,
  handle: async () => {
    const group = BeanFactory.getInstance().getBeanValue<GroupConfig>('group');
    if (!group?.listen?.length) return;

    for (const item of group.listen) {
      try {
        const groupId = item.group_id;
        if (!await chatMemoryService.needsCompression(groupId)) continue;

        logger.info(`Compressing memory for group ${groupId}...`);
        const entries = await chatMemoryService.getUncompressedContent(groupId);
        if (entries.length === 0) continue;

        const text = entries.map(e => e.content).join('\n');
        const messages: BaseMessage[] = [
          { role: 'system', content: [{ type: 'text', text: COMPRESS_PROMPT }] },
          { role: 'user', content: [{ type: 'text', text }] },
        ];

        const summary = await AIRequestManager.getInstance()
          .sendMessage('openai', messages)
          .catch((e: any) => {
            logger.error(`Compress failed for group ${groupId}:`, e?.message);
            return '';
          });

        if (!summary || typeof summary !== 'string') continue;

        const lastId = entries[entries.length - 1].id;
        await chatMemoryService.saveSummary(groupId, summary, lastId);
      } catch (e) {
        logger.error(`Error processing group ${item.group_id}:`, e);
      }
    }
  },
};

// ScheduleFactory.getInstance().registry(compressMemorySchedule);
