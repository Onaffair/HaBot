import axios, { AxiosRequestConfig } from "axios";
import { AIPlatform, AIRequestOptions, BaseMessage } from "./types";

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

/** AI 平台统一消息发送门面：单例 */
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
   * @param platform   平台注册名（如 'openai' | 'zhipu' | 'ChatTTS'）
   * @param body       消息 body：统一消息格式或纯字符串（如 TTS 文本）
   * @param options    可选 AI 参数 obj（model、response_format 等），未传的项沿用平台默认值
   * @param axiosConfig 可选底层 HTTP 参数，按次覆盖平台内置默认配置
   */
  async sendMessage(
    platform: string,
    body: BaseMessage[] | string,
    options?: AIRequestOptions,
    axiosConfig?: AxiosRequestConfig,
  ) {
    const p = this.registry.get(platform)

    // adapter 返回 { headers, body }
    const { headers, body: requestBody } = p.adapter(body, options)
    // console.log('Req info', JSON.stringify(requestBody, null, 2));
    const res = await this.axios.post(p.url, requestBody, {
      headers,
      ...p.axiosConfig,
      ...axiosConfig,
    })

    return p.parser(res.data)
  }
}
