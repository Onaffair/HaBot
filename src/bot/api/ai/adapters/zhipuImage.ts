import { PlatformAdapter } from './interface';
import { UnifiedMessage } from '../types';

/**
 * 智谱图片生成适配器。
 * 适用场景：智谱 CogView / images/generations 端点。
 * 注意：图片生成没有 messages 概念，所有输入被拼接为 prompt 字符串。
 */
export class ZhipuImageAdapter implements PlatformAdapter {
  readonly platform = 'zhipu';

  buildRequest(
    messages: UnifiedMessage[],
    bodyTemplate: Record<string, any>,
    options?: Record<string, any>,
  ): Record<string, any> {
    // 将所有文本内容拼接成 prompt
    const prompt = messages
      .flatMap(msg => msg.content)
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')
      + (options?.summary ? `\n总结：${options.summary}` : '');

    return {
      ...bodyTemplate,
      ...options,
      prompt,
    };
  }

  parseResponse(response: any): { url: string } {
    // 智谱 images/generations 返回: { data: [{ url: "..." }] }
    return response?.data?.[0] ?? { url: '' };
  }
}
