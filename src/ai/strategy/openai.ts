import { AIPlatform, AIRequestOptions, BaseMessage } from "../types";
import { AIRequestManager } from "../manager";

export type ChatCompletionChoicesData = {
  message?: {
    role?: string;
    content?: string;
    /**
     * 仅 deepseek-R1 系列支持 reasoning_content。这部分返回推理内容，与 content 处于同一层级。在每轮对话中，模型输出推理链内容（reasoning_content）和最终答案（content）。在下一轮对话中，之前轮次的推理链内容不会被追加到上下文中。
     */
    reasoning_content?: string;
    /**
     * 模型生成的工具调用，例如函数调用。
     */
    tool_calls?: ChatCompletionMessageToolCall[];
  };
  finish_reason?: "stop" | "eos" | "length" | "tool_calls";
}[];

export interface Response {
  id?: string;
  choices?: ChatCompletionChoicesData;
  usage?: UsageData;
  created?: number;
  model?: string;
  object?: "chat.completion";
}
export interface ChatCompletionMessageToolCall {
  /**
   * 工具调用的 ID。
   */
  id: string;
  /**
   * 工具类型。目前仅支持 `function`。
   */
  type: "function";
  /**
   * 模型调用的函数。
   */
  function: {
    /**
     * 要调用的函数名称。
     */
    name: string;
    /**
     * 模型以 JSON 格式生成的函数调用参数。请注意，模型并不总是生成有效的 JSON，可能会产生函数 schema 中未定义的参数。在调用函数前，请在代码中验证参数。
     */
    arguments: string;
  };
}
export interface UsageData {
  /**
   * 提示词中的 token 数量。
   */
  prompt_tokens: number;
  /**
   * 生成内容中的 token 数量。
   */
  completion_tokens: number;
  /**
   * 请求中使用的总 token 数量（提示词 + 生成内容）。
   */
  total_tokens: number;
  /**
   * 本次请求输入中命中缓存的 token 数量。
   */
  prompt_cache_hit_tokens?: number;
  /**
   * 本次请求输入中未命中缓存的 token 数量。
   */
  prompt_cache_miss_tokens?: number;
  /**
   * 生成内容中 token 使用的详细分解。
   */
  completion_tokens_details?: {
    /**
     * 模型用于推理的 token。
     */
    reasoning_tokens?: number;
  };
  /**
   * 提示词中 token 使用的详细分解。
   */
  prompt_tokens_details?: {
    /**
     * 提示词中存在的缓存 token。
     */
    cached_tokens?: number;
  };
}

class OpenAIPlatform implements AIPlatform {
  name = 'openai'
  model = 'Pro/moonshotai/Kimi-K2.6'
  // model = 'deepseek-ai/DeepSeek-V4-Flash' 
  url = process.env.OPENAI_BASE_URL || 'https://api.siliconflow.cn/v1/chat/completions'
  secret = process.env.OPENAI_API_KEY || ''

  // 类成员变量作为默认值
  private stream = false
  private maxTokens = 100000

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
            content: content
              .filter(({ type }) => ['text', 'image', 'audio'].includes(type))
              .map(t => {
                const { type } = t
                switch (type) {
                  case 'text':
                    return { type, text: t.text }
                  case 'image':
                    return { type: 'image_url', image_url: { url: t.url } }
                  case "audio":
                    return { type: 'audio_url', audio_url: { url: t.url } }
                  // case "video":
                  //   return { type: 'video_url', video_url: { url: t.url } }
                }
              })
          }
        }),
      },
    }
  }
  parser(response: Response) {
    const { choices } = response
    if (!choices) return ''
    const { content, tool_calls } = choices?.[0].message
    const [tool_call] = tool_calls ?? []
    if (!tool_call) {
      const BOX_TAG_RE = /[<|]begin_of_box[>|]|[<|]end_of_box[>|]/g;
      return content.replace(BOX_TAG_RE, '').trim()
    } else {
      return tool_call
    }
  }
}

const fac = AIRequestManager.getInstance()
fac.registerPlatform(new OpenAIPlatform())
