import { BeanFactory } from '@/core/bean';
import { createLogger } from './logger';
import DatabaseService from './db';

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
    const db = DatabaseService.getInstance();
    if (!db.chatMemory) return;
    try {
      await db.chatMemory.create({
        data: { groupId, userId, role, content },
      });
    } catch (e) {
      logger.error('Failed to save chat memory:', e);
    }
  }

  /** 获取最近 N 条对话 */
  async getRecent(groupId: string, limit = 20): Promise<ChatMemoryEntry[]> {
    const db = DatabaseService.getInstance();
    if (!db.chatMemory) return [];
    try {
      return await db.chatMemory.findMany({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }) as ChatMemoryEntry[];
    } catch (e) {
      logger.error('Failed to read chat memory:', e);
      return [];
    }
  }

  /** 获取最近的摘要列表 */
  async getSummaries(groupId: string, limit = 3): Promise<SummaryEntry[]> {
    const db = DatabaseService.getInstance();
    if (!db.memorySummary) return [];
    try {
      return await db.memorySummary.findMany({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }) as SummaryEntry[];
    } catch (e) {
      logger.error('Failed to read memory summaries:', e);
      return [];
    }
  }

  /** 获取未压缩的消息数 */
  async getUncompressedCount(groupId: string): Promise<number> {
    const db = DatabaseService.getInstance();
    if (!db.chatMemory || !db.memorySummary) return 0;
    try {
      const latest = await db.memorySummary.findFirst({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
      });
      const sinceId = latest?.sinceId ?? 0;
      return await db.chatMemory.count({
        where: { groupId, id: { gt: sinceId } },
      });
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
    const db = DatabaseService.getInstance();
    if (!db.chatMemory || !db.memorySummary) return [];
    try {
      const latest = await db.memorySummary.findFirst({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
      });
      const sinceId = latest?.sinceId ?? 0;
      return await db.chatMemory.findMany({
        where: { groupId, id: { gt: sinceId } },
        orderBy: { id: 'asc' },
        take: COMPRESS_THRESHOLD,
        select: { id: true, content: true },
      });
    } catch {
      return [];
    }
  }

  /** 保存摘要 */
  async saveSummary(groupId: string, summary: string, sinceId: number): Promise<void> {
    const db = DatabaseService.getInstance();
    if (!db.memorySummary) return;
    try {
      await db.memorySummary.create({
        data: { groupId, summary, sinceId },
      });
      logger.info(`Memory compressed for group ${groupId}, since memory #${sinceId}`);
    } catch (e) {
      logger.error('Failed to save memory summary:', e);
    }
  }
}

export const chatMemoryService = new ChatMemoryService();
export default ChatMemoryService;
