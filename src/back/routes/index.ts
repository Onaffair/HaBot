import { Express } from 'express';
import { createGroupListenRoutes } from './groupListen';
import { createResourceCategoryRoutes } from './resourceCategory';
import { createChatMemoryRoutes } from './chatMemory';
import { createMemorySummaryRoutes } from './memorySummary';
import { createUserBlacklistRoutes } from './userBlacklist';

export function registerRoutes(app: Express) {
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'HaBot Backend is running' });
  });

  createGroupListenRoutes(app);
  createResourceCategoryRoutes(app);
  createChatMemoryRoutes(app);
  createMemorySummaryRoutes(app);
  createUserBlacklistRoutes(app);
}
