/**
 * 统一消息格式 —— 命令层和适配器之间的契约。
 * 命令层构建 UnifiedMessage[]，适配器负责转换为平台特定请求体。
 */

/** 单条内容块：文字、图片、语音或视频 */
export interface UnifiedContent {
  type: 'text' | 'image' | 'audio' | 'video';
  /** type === 'text' 时使用 */
  text?: string;
  /** type === 'image' / 'audio' / 'video' 时使用 */
  url?: string;
}

/** 一条完整的消息（system / user / assistant） */
export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant';
  content: UnifiedContent[];
}
