import { AIPlatform, AIRequestOptions, BaseMessage } from '../types';
import { AIRequestManager } from '../manager';
import { configService } from '@/services/db/systemConfig';
import type { ChatCompletionMessageToolCall } from './openai';

// ============================================================================
// DeepSeek 对话平台
// ----------------------------------------------------------------------------
// DeepSeek Chat Completions 与 OpenAI 接口格式兼容：
//   端点  POST https://api.deepseek.com/chat/completions
//   认证  Authorization: Bearer <DEEPSEEK_API_KEY>
// 平台的 base URL 与密钥统一走 configService，管理后台改动即刻生效；
// 请求体与 openai 策略保持同一套字段，新增能力（thinking / reasoning_effort
// 等 DeepSeek 扩展参数）可通过 AIRequestOptions 透传，无需改本文件。
// ============================================================================

/** DeepSeek 非流式对话响应（仅声明本项目用到的字段） */
interface DeepSeekChatResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
      /** 思维链内容：开启 thinking 时返回，不进入后续上下文 */
      reasoning_content?: string;
      tool_calls?: ChatCompletionMessageToolCall[];
    };
    finish_reason?: string;
  }>;
}

/** DeepSeek 对话消息内容段（OpenAI 兼容格式） */
interface DeepSeekContentPart {
  type: string;
  text?: string;
  image_url?: { url?: string };
}

class DeepSeekPlatform implements AIPlatform {
  name = 'deepseek'
  /** 默认模型：官方文档当前推荐 deepseek-flash，可通过 options.model 覆盖（如 deepseek-v4-pro） */
  model = 'deepseek-flash'
  /** 取值改为访问器：每次请求实时读配置，DB 改动即刻生效 */
  get url() {
    return configService.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/chat/completions')
  }
  get secret() {
    return configService.get('DEEPSEEK_API_KEY', '')
  }

  // 类成员变量作为默认值
  private stream = false
  /** 单次回复的 token 上限：DeepSeek 各模型上限不同，取通用的 8192 避免超限报错 */
  private maxTokens = 8192

  adapter(messages: BaseMessage[], options?: AIRequestOptions) {
    return {
      headers: {
        Authorization: `Bearer ${this.secret}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: this.model,
        max_tokens: this.maxTokens,
        stream: this.stream,
        ...options,
        messages: messages.map(message => {
          const { role, content } = message
          return {
            role,
            // 对话接口的富媒体段只支持文本与图片；音频/视频段丢弃，避免整条请求报错
            content: content.flatMap((part): DeepSeekContentPart[] => {
              switch (part.type) {
                case 'text':
                  return [{ type: 'text', text: part.text }]
                case 'image':
                  return [{ type: 'image_url', image_url: { url: part.url } }]
                default:
                  return []
              }
            }),
          }
        }),
      },
    }
  }

  parser(response: DeepSeekChatResponse) {
    const message = response?.choices?.[0]?.message
    if (!message) return ''
    const [toolCall] = message.tool_calls ?? []
    // 工具调用交给对话循环消费；否则返回纯文本，思维链 reasoning_content 不参与回复
    return toolCall ?? (message.content ?? '').trim()
  }
}

const fac = AIRequestManager.getInstance()
fac.registerPlatform(new DeepSeekPlatform())
