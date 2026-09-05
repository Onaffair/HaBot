import { Express } from 'express';
import { createGroupListenRoutes } from './groupListen';
import { createChatMemoryRoutes } from './chatMemory';
import { createMemorySummaryRoutes } from './memorySummary';
import { createUserBlacklistRoutes } from './userBlacklist';
import { createManagedResourceRoutes } from './managedResource';
import { createFileSystemRoutes } from './fileSystem';
import { createCommandRuleRoutes } from './commandRule';

export function registerRoutes(app: Express) {
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'HaBot Backend is running' });
  });

  createGroupListenRoutes(app);
  createChatMemoryRoutes(app);
  createMemorySummaryRoutes(app);
  createUserBlacklistRoutes(app);
  createManagedResourceRoutes(app);
  createFileSystemRoutes(app);
  createCommandRuleRoutes(app);
}
