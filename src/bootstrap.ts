/**
 * 应用启动入口。
 * 从 Prisma 数据库加载配置并填充 config 对象，
 * 然后动态加载 bot 主模块（此时所有 @config 消费者拿到完整配置）。
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import config, { loadConfig } from './bot.config';
import { ossService } from '@utils/OSS';
async function bootstrap() {
  const prisma = new PrismaClient();

  try {
    console.log('[Bootstrap] Loading config from database...');

    // 1. 读取 SystemConfig 键值对
    const rows = await prisma.systemConfig.findMany();
    const data: Record<string, string> = {};
    for (const row of rows) {
      data[row.key] = row.value;
    }
    console.log(`[Bootstrap] Loaded ${rows.length} system configs`);

    // 2. 读取 AI 配置
    const aiEntries = await prisma.aIConfigEntry.findMany({
      where: { disabled: false },
    });
    console.log(`[Bootstrap] Loaded ${aiEntries.length} AI configs`);

    // 3. 读取群组列表
    const groups = await prisma.groupListen.findMany({
      where: { enabled: true },
    });

    console.log(`[Bootstrap] Loaded ${groups.length} groups`);

    // 4. 构建 config 对象（默认值逻辑从 bot.config.ts 迁移至此）
    loadConfig({
      ws: {
        url: data.WS_URL || 'ws://127.0.0.1:6658',
        token: data.WS_TOKEN || '',
      },
      http: {
        baseURL: data.HTTP_BASE_URL || 'http://127.0.0.1:3000',
        timeout: Number(data.HTTP_TIMEOUT || 30000),
        token: data.HTTP_TOKEN || '',
      },
      group: {
        listen: (groups || [])
          .filter((t) => t.enabled)
          .map((item) => ({ group_id: item.groupId, members: [] })),
      },
      me: data.ME || '2934785512',
      resource: {
        path: data.RESOURCE_PATH || '@/src/resource',
        folder: safeJsonParse(data.RESOURCE_FOLDER, []),
      },
      ai: aiEntries.map((e) => ({
        name: e.name,
        platform: e.platform ?? undefined,
        config: { baseURL: e.baseUrl, timeout: e.timeout },
        secret: e.secret,
        body: safeJsonParse(e.body, {}),
        disable: e.disabled,
      })),
      oss: {
        region: data.OSS_REGION || 'oss-cn-hangzhou',
        accessKeyId: data.OSS_ACCESS_KEY_ID || '',
        accessKeySecret: data.OSS_ACCESS_KEY_SECRET || '',
        bucket: data.OSS_BUCKET || '',
      },
      database: {
        url: data.DATABASE_URL || '',
      },
      BG: [],
    });

    // 配置加载完成后重新初始化 OSS（首次模块加载时凭据为空）
    // ossService.init();
    console.log('[Bootstrap] Config ready, starting bot...');
  } finally {
    await prisma.$disconnect();
  }
  const {startBot} = await import('@/botLauncher')
  startBot();
}

function safeJsonParse(raw: string | undefined, fallback: any): any {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[Bootstrap] Failed to parse JSON, using fallback');
    return fallback;
  }
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal error:', err);
  process.exit(1);
});
