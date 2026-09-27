import { Express } from 'express';
import { createGroupListenRoutes } from './groupListen';
import { createUserBlacklistRoutes } from './userBlacklist';
import { createManagedResourceRoutes } from './managedResource';
import { createFileSystemRoutes } from './fileSystem';
import { createCommandRuleRoutes } from './commandRule';
import { createCanvasRoutes } from './canvas';
import { createBotControlRoutes } from './botControl';
import { createSystemConfigRoutes } from './systemConfig';

export function registerRoutes(app: Express) {
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'HaBot Backend is running' });
  });

  createGroupListenRoutes(app);
  createUserBlacklistRoutes(app);
  createManagedResourceRoutes(app);
  createFileSystemRoutes(app);
  createCommandRuleRoutes(app);
  createCanvasRoutes(app);
  createBotControlRoutes(app);
  createSystemConfigRoutes(app);
}
