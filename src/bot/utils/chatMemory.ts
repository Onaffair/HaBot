import { createLogger } from './logger';
import { chatMemoryService as chatMemoryCrud } from '@/services/db';
import { memorySummaryService as memorySummaryCrud } from '@/services/db';

const logger = createLogger('ChatMemory');

export interface ChatMemoryEntry {
  id: number;
  groupId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface SummaryEntry {
  id: number;
  groupId: string;
  summary: string;
  sinceId: number;
  createdAt: Date;
}

const COMPRESS_THRESHOLD = 50; // 超过此条数触发压缩
class ChatMemoryService {
  /** 写入一条对话 */
  async add(groupId: string, userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    try {
      await chatMemoryCrud.create({ groupId, userId, role, content });
    } catch (e) {
      logger.error('Failed to save chat memory:', e);
    }
  }

  /** 获取最近 N 条对话 */
  async getRecent(groupId: string, limit = 20): Promise<ChatMemoryEntry[]> {
    try {
      const records = await chatMemoryCrud.findRecent(groupId, limit);
      return records as ChatMemoryEntry[];
    } catch (e) {
      logger.error('Failed to read chat memory:', e);
      return [];
    }
  }

  /** 获取最近的摘要列表 */
  async getSummaries(groupId: string, limit = 3): Promise<SummaryEntry[]> {
    try {
      const records = await memorySummaryCrud.findRecent(groupId, limit);
      return records as SummaryEntry[];
    } catch (e) {
      logger.error('Failed to read memory summaries:', e);
      return [];
    }
  }

  /** 获取未压缩的消息数 */
  async getUncompressedCount(groupId: string): Promise<number> {
    try {
      const latest = await memorySummaryCrud.findLatest(groupId);
      const sinceId = latest?.sinceId ?? 0;
      return await chatMemoryCrud.count({ groupId, afterId: sinceId });
    } catch {
      return 0;
    }
  }

  /** 是否需要压缩 */
  async needsCompression(groupId: string): Promise<boolean> {
    const count = await this.getUncompressedCount(groupId);
    return count >= COMPRESS_THRESHOLD;
  }

  /** 获取未压缩的原始内容（用于 LLM 摘要） */
  async getUncompressedContent(groupId: string): Promise<{ id: number; content: string }[]> {
    try {
      const latest = await memorySummaryCrud.findLatest(groupId);
      const sinceId = latest?.sinceId ?? 0;
      const records = await chatMemoryCrud.findMany({
        groupId,
        afterId: sinceId,
        limit: COMPRESS_THRESHOLD,
        orderBy: 'id_asc'
      });
      return records.map(r => ({ id: r.id, content: r.content }));
    } catch {
      return [];
    }
  }

  /** 保存摘要 */
  async saveSummary(groupId: string, summary: string, sinceId: number): Promise<void> {
    try {
      await memorySummaryCrud.create({ groupId, summary, sinceId });
      logger.info(`Memory compressed for group ${groupId}, since memory #${sinceId}`);
    } catch (e) {
      logger.error('Failed to save memory summary:', e);
    }
  }
}

export const chatMemoryService = new ChatMemoryService();
export default ChatMemoryService;