import { Express } from 'express';
import { createGroupListenRoutes } from './groupListen';
import { createUserBlacklistRoutes } from './userBlacklist';
import { createFileSystemRoutes } from './fileSystem';
import { createCanvasRoutes } from './canvas';
import { createBotControlRoutes } from './botControl';
import { createSystemConfigRoutes } from './systemConfig';
import { createAiPersonaRoutes } from './aiPersona';

export function registerRoutes(app: Express) {
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'HaBot Backend is running' });
  });

  createGroupListenRoutes(app);
  createUserBlacklistRoutes(app);
  createFileSystemRoutes(app);
  createCanvasRoutes(app);
  createBotControlRoutes(app);
  createSystemConfigRoutes(app);
  createAiPersonaRoutes(app);
}
