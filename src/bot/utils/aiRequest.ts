import axios from 'axios'
import config from '@config'
import { createLogger } from '@utils/logger'


const logger = createLogger('ai')
export function getAIConfig(name?: string) {
  if (Array.isArray(config.ai)) {
    if (name) {
      return config.ai.find(item => item.name === name) || config.ai[0]
    }
    return config.ai[0]
  }
  return config.ai
}

export function createAIRequest(name?: string) {
  const aiConfig = getAIConfig(name)
  const aiReq = axios.create({
    ...aiConfig?.config
  })

  aiReq.defaults.headers['Authorization'] = `Bearer ${aiConfig?.secret}`

  aiReq.interceptors.request.use(c => {
    return c
  })
  aiReq.interceptors.response.use(
    res => {
      logger.info(res.data?.msg || res.data)
      return res.data
    },
    err => {
      logger.error(err?.data || err)
      return Promise.reject(err.data)
    }
  )
  return aiReq
}

// 默认使用第一个 AI 配置
export default createAIRequest()
