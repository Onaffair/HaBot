import { PlatformAdapter } from './interface';
import { OpenAIAdapter } from './openai';
import { ZhipuImageAdapter } from './zhipuImage';

/** 已注册的适配器映射 */
const registry = new Map<string, PlatformAdapter>();

/** 注册内置适配器 */
function registerDefaults(): void {
  const openai = new OpenAIAdapter();
  const zhipuImage = new ZhipuImageAdapter();
  registry.set(openai.platform, openai);
  registry.set(zhipuImage.platform, zhipuImage);
}

// 模块加载时注册
registerDefaults();

/**
 * 根据平台标识获取适配器实例
 */
export function getAdapter(platform: string): PlatformAdapter | undefined {
  return registry.get(platform);
}

/**
 * 注册自定义适配器（扩展新平台时使用）
 */
export function registerAdapter(adapter: PlatformAdapter): void {
  registry.set(adapter.platform, adapter);
}

export { PlatformAdapter } from './interface';
