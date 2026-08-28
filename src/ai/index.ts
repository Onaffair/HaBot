// 导入所有 AI 平台策略模块，触发自注册
import './strategy/openai'
import './strategy/zhipuImage'
import './strategy/fishAudio'

export { AIRequestManager } from './manager'
export type { BaseMessage, BaseMessageContent, AIRequestOptions, AIPlatform, AdapterResult } from './types'
export type { ChatCompletionMessageToolCall } from './strategy/openai'
