// 导入所有 AI 平台策略模块，触发自注册
import './strategy/openai'
import './strategy/zhipuImage'
import './strategy/fishAudio'

export { AIRequestManager } from './type'
export type { AIPlatform, BaseMessage, BaseMessageContent, RequestOptions } from './type'
