import { PlatformAdapter } from './interface';
import { UnifiedContent, UnifiedMessage } from '../types';

/**
 * OpenAI 兼容格式适配器。
 * 适用场景：SiliconFlow / DeepSeek / OpenAI 等 chat/completions 端点。
 */
export class OpenAIAdapter implements PlatformAdapter {
  readonly platform = 'sliceflow';

  buildRequest(
    messages: UnifiedMessage[],
    bodyTemplate: Record<string, any>,
    options?: Record<string, any>,
  ): Record<string, any> {
    const body: Record<string, any> = {
      ...bodyTemplate,
      ...options,
      messages: messages.map(msg => this.transformMessage(msg)),
    };

    return body;
  }

  parseResponse(response: any): string {
    return response?.choices?.[0]?.message?.content ?? '';
  }

  /** 将一条 UnifiedMessage 转换为 OpenAI 消息格式 */
  private transformMessage(msg: UnifiedMessage): Record<string, any> {
    // 如果 content 只有一条纯文本，可简化为字符串（大部分 LLM 支持）
    if (
      msg.content.length === 1 &&
      msg.content[0].type === 'text'
    ) {
      return {
        role: msg.role,
        content: msg.content[0].text,
      };
    }

    // 多模态内容
    return {
      role: msg.role,
      content: msg.content.map(item => this.transformContent(item)),
    };
  }

  /** 将单条 UnifiedContent 转换为 OpenAI content 数组元素 */
  private transformContent(item: UnifiedContent): Record<string, any> {
    switch (item.type) {
      case 'text':
        return { type: 'text', text: item.text };
      case 'image':
        return { type: 'image_url', image_url: { url: item.url } };
      case 'audio':
        return { type: 'audio_url', audio_url: { url: item.url } };
      case 'video':
        return { type: 'video_url', video_url: { url: item.url } };
      default:
        return { type: 'text', text: '' };
    }
  }
}
