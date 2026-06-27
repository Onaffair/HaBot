import axios, { AxiosRequestConfig } from "axios";

export interface BaseMessageContent {
  type: 'text' | 'image' | 'audio' | 'video';
  text?: string;
  url?: string;
}

export interface BaseMessage {
  role: 'system' | 'user' | 'assistant',
  content: BaseMessageContent[]
}
/** 每次请求的可选参数：AI 参数与 Axios 参数，分属两个子 key */
export interface RequestOptions {
  /** AI 请求参数：调用方按需传入，未传的项沿用实现类成员变量默认值 */
  aiOptions?: {
    response_format?: {
      type: 'text' | 'json_object' | 'json_schema'
    };
    model?: string;
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
    tools?: object,
    tool_choice?: string
  };
  /** Axios 请求参数：调用方按需传入，未传的项沿用 adapter 返回的 axiosConfig */
  axiosConfig?: AxiosRequestConfig
}

/** adapter 返回值扩展：可携带实现类的 axios 层默认配置 */
export interface AdapterResult {
  headers: Record<string, string>;
  body: Record<string, any>;
}

export interface AIPlatform {
  name: string,
  url: string,
  secret: string,
  model: string,
  /** BaseMessage[] 转换为平台请求体，返回 headers、body 及可选的 axiosConfig */
  adapter: (messages: BaseMessage[] | string, options?: RequestOptions) => AdapterResult,
  /** 解析平台原始响应 */
  parser: (response: any) => any,
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
   * @param options   可选 AI 参数与 Axios 参数透传，未传的项按实现类的成员变量默认值
   */
  async sendMessage(
    name: string,
    messages: BaseMessage[] | string,
    options?: RequestOptions,
  ) {
    const platform = this.registry.get(name)

    // adapter 返回 { headers, body, axiosConfig }
    const { headers, body } = platform.adapter(messages, options)
    // console.log(JSON.stringify(headers), JSON.stringify(body));

    const url = platform.url;

     const res = await this.axios.post(url, body, {
      headers,
      ...options?.axiosConfig
    })
    // console.log(`AI response status: ${res.status}, data:`, res.data);

    return platform.parser(res.data)
  }
}
