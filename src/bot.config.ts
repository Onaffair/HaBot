
import dotenv from 'dotenv'
dotenv.config()

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
    listen: (process.env.GROUP_LISTEN_IDS || '').split(',').filter(Boolean).map(id => ({
      group_id: id,
      members: []
    }))
  },
  me: process.env.BOT_ME || '2934785512',
  resource: {
    path: process.env.RESOURCE_PATH || '@/src/resource',
    folder: [
      {
        name: 'cat',
        path: 'cat',
        children: [],
        type: 'image',
      },
      {
        name: 'cat_voice',
        path: 'voice/haqi',
        children: [],
        type: 'voice'
      },
      {
        name: 'stress',
        path: 'bluelock',
        children: [],
        type: 'image',
      }
    ]
  },
  ai: {
    config: {
      baseURL: process.env.AI_API_URL || 'https://api.siliconflow.cn/v1/chat/completions',
      timeout: Number(process.env.AI_API_TIMEOUT || 300000),
    },
    disable: false,
    secret: process.env.AI_API_KEY || '',
    body: {
      model: process.env.AI_MODEL || 'zai-org/GLM-4.6V',
      messages: [],
      stream: false,
      max_tokens: Number(process.env.AI_MAX_TOKENS || 10000),
      temperature: Number(process.env.AI_TEMPERATURE || 0.2),
      response_format: {
        type: 'text'
      }
    },
  }
}

export function updateConfig(data: object) {
  Object.assign(config, { ...config, ...data })
}

export default config

