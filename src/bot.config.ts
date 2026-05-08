import 'dotenv/config'
import { createLogger } from '@utils/logger'

const logger = createLogger('Config')

function parseJSON<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    logger.error('Failed to parse JSON config')
    return fallback
  }
}

let config = {
  ws: {
    url: process.env.WS_URL || 'ws://127.0.0.1:6658',
    token: process.env.WS_TOKEN || ''
  },
  http: {
    baseURL: process.env.HTTP_BASE_URL || 'http://127.0.0.1:3000',
    timeout: Number(process.env.HTTP_TIMEOUT || 30000),
    token: process.env.HTTP_TOKEN || ''
  },
  group: {
    listen: process.env.GROUP_LISTEN.split(',').map(t => ({
      group_id: t,
      members: []
    }))
  },
  me: process.env.ME || '2934785512',
  resource: {
    path: process.env.RESOURCE_PATH || '@/src/resource',
    folder: parseJSON(process.env.RESOURCE_FOLDER, [] as { name: string; path: string; type: string; children?: string[] }[])
  },
  ai: parseJSON(process.env.AI_CONFIG, [] as any[]),
  oss: {
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || ''
  },
  database: {
    url: process.env.DATABASE_URL || ''
  },
  BG: [] as string[]
}

export function updateConfig(data: Record<string, any>) {
  Object.assign(config, data)
}

export default config
