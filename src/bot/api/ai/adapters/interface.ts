import { UnifiedMessage } from '../types';

/**
 * 平台适配器接口。
 * 每个 AI 平台实现此接口，负责将统一消息格式转换为平台请求体，
 * 并将平台响应解析为结果。
 */
export interface PlatformAdapter {
  /** 适配器标识，与 config.json 中 ai[].platform 对应 */
  readonly platform: string;

  /**
   * 将统一消息格式 + body 模板 + 额外选项合并为平台请求体
   * @param messages    统一格式的聊天记录
   * @param bodyTemplate   config.json 中 ai[].body 的模板（含 model/temperature 等默认值）
   * @param options     调用方传入的额外覆盖参数
   */
  buildRequest(
    messages: UnifiedMessage[],
    bodyTemplate: Record<string, any>,
    options?: Record<string, any>,
  ): Record<string, any>;

  /**
   * 解析平台响应。
   * LLM 类平台返回纯文本字符串，图片生成等返回对象。
   */
  parseResponse(response: any): any;
}
