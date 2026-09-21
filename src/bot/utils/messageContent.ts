import { MessageItem, OB11MessageMixType } from "@/interface/onebot";
import type { BaseMessageContent } from "@ai";

// ============================================================================
// 消息段 -> LLM 统一内容格式 解析工具
//
// 自 api/ai/llm.ts 迁入 utils 工具层：解析逻辑与具体 AI 平台无关，属于
// 消息处理的通用能力。图片等媒体 URL 直接透传 message 中解析出的信息，
// 不再做异步的 QQ CDN 稳定化下载。
// ============================================================================

/** 递归展开的最大深度，防止畸形/循环数据导致无限递归 */
const MAX_FLATTEN_DEPTH = 10;

/** 判断一个值是否为合法的消息段对象 */
function isMessageItem(value: unknown): value is MessageItem {
  return !!value && typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string';
}

/**
 * node / forward 的 content 可能是 纯文本字符串 / 单条消息段 / 消息段数组，
 * 统一归一化为消息段数组以便递归展开。
 */
function toItemArray(content: OB11MessageMixType | null | undefined): MessageItem[] {
  if (content == null) return [];
  if (typeof content === 'string') {
    // 纯文本型节点：拼成一个 text 消息段
    return content ? [{ type: 'text', data: { text: content } } as MessageItem] : [];
  }
  if (Array.isArray(content)) {
    return content.filter(isMessageItem);
  }
  return isMessageItem(content) ? [content] : [];
}

/**
 * 解析消息段列表为 LLM 统一内容格式：text/image/audio/video 直接透传 URL，
 * forward / node 递归展开其内层内容。
 */
export function extractMessageContent(items: MessageItem[]): BaseMessageContent[] {
  const result: BaseMessageContent[] = [];
  appendItems(result, items, 0);
  return result;
}

/** 同步：逐条解析消息段，遇 forward/node 递归展开 */
function appendItems(result: BaseMessageContent[], items: MessageItem[], depth: number): void {
  if (depth > MAX_FLATTEN_DEPTH) return;
  for (const item of items) {
    switch (item.type) {
      case 'text':
        result.push({ type: 'text', text: item.data.text });
        break;
      case 'image':
        result.push({ type: 'image', url: item.data.url });
        break;
      case 'record':
        result.push({ type: 'audio', url: item.data.url });
        break;
      case 'video':
        result.push({ type: 'video', url: item.data.url });
        break;
      // 合并转发：其 content 一般是若干 node，需逐条下钻
      case 'forward':
        appendItems(result, toItemArray(item.data.content), depth + 1);
        break;
      // 转发节点：真正的内层内容在 node.data.content 中，可能是文本/单条/数组/更深层 forward
      case 'node':
        appendItems(result, toItemArray(item.data.content), depth + 1);
        break;
    }
  }
}
