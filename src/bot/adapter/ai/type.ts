import axios from "axios";

export interface BaseMessageContent {
  type: 'text' | 'image' | 'audio' | 'video';
  text?: string;
  url?: string;
}

export interface BaseMessage {
  role: 'system' | 'user' | 'assistant',
  content: BaseMessageContent[]
}

export interface AIPlatform {
  name: string,
  url: string,
  secret: string,
  model: string,
  /**  BaseMessage[] 转换为平台请求体，返回 headers 和 body */
  adapter: (messages: BaseMessage[]) => { headers: Record<string, string>; body: Record<string, any> },
  /** 解析平台原始响应 */
  parser: (response: any) => any
  stream?: boolean,
  max_tokens?: number,
  temperature?: number,
  /** axios 代理配置，用于访问需要代理的 API（如国外站点） */
  proxy?: { protocol: string; host: string; port: number },
  responseType?:
  | 'arraybuffer'
  | 'blob'
  | 'document'
  | 'json'
  | 'text'
  | 'stream'
  | 'formdata';

}

class PlatformRegistry {
  private map: Map<string, AIPlatform>;
  constructor() {
    this.map = new Map()
  }
  register(platform: AIPlatform) {
    this.map.set(platform.name, platform)
  }

  get(name: string) {
    const platform = this.map.get(name)
    if (!platform) {
      throw new Error(`platform ${name} not exist`)
    }
    return platform
  }
}

export class AIRequestManager {
  private static instance: AIRequestManager;
  private registry: PlatformRegistry
  private axios
  private constructor() {
    this.registry = new PlatformRegistry()
    this.axios = axios.create({
      timeout: 300000,
    })
  }
  static getInstance() {
    if (!this.instance) {
      this.instance = new AIRequestManager()
    }
    return this.instance
  }
  registerPlatform(aiPlatform: AIPlatform) {
    this.registry.register(aiPlatform)
  }

  /**
   * 发送消息到指定平台。
   * @param name      平台注册名
   * @param messages  统一消息格式
   * @param overrides 可选覆盖（url / secret / model），用于数据库配置覆盖平台默认值
   */
  async sendMessage(
    name: string,
    messages: BaseMessage[],
    overrides?: { url?: string; secret?: string; model?: string; max_tokens?: number },
  ) {
    const platform = this.registry.get(name)

    // adapter 返回 { headers, body }
    const { headers, body } = platform.adapter(messages)
    // console.log("reqBody", JSON.stringify(body));

    // overrides 覆盖 body 中的同名字段
    if (overrides?.model) body.model = overrides.model
    if (overrides?.max_tokens != null) body.max_tokens = overrides.max_tokens

    const url = overrides?.url || platform.url;
    const res = await this.axios.post(url, body, {
      headers,
      ...(platform.proxy ? { proxy: platform.proxy } : {}),
      ...(platform.responseType ? { responseType: platform.responseType } : {}),
    })
    // console.log(`AI response status: ${res.status}, data:`, res.data);

    return platform.parser(res.data)
  }
}
