import { Session } from "@/core/session";
import { OneBotMessageReceive, MessageItem, GroupUserInfo, OB11MessageMixType } from "@/interface/onebot";
import axios from "axios";
import { ossService } from "@/utils/OSS";
import type { BaseMessage, BaseMessageContent } from "@ai";

// ========== 共享工具：将群聊消息项转换为统一内容格式 ==========

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

/** QQ 图片 CDN 域名（此类链接带 rkey 短时效，外部服务无法稳定访问） */
const QQ_CDN_RE = /\.qpic\.cn\//i;

/**
 * 将图片 URL 稳定化：QQ CDN 短链下载后转存 OSS，返回长期可访问的 URL。
 * 转存失败时降级为 base64 data URL；再失败则保留原 URL。
 */
async function stabilizeImageUrl(url: string): Promise<string> {
  // 非 QQ CDN 链接视为已稳定，直接返回
  if (!QQ_CDN_RE.test(url)) return url;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    const buffer = Buffer.from(res.data);
    const mime = (res.headers['content-type'] as string) || 'image/jpeg';
    const ext = mime.includes('png') ? 'png' : 'jpg';
    const name = `ai/chat/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const uploaded = await ossService.put(name, buffer);
    if (uploaded?.url) return uploaded.url;
    // OSS 不可用 → base64 data URL 兜底（部分平台支持）
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    // 下载/转存失败，保留原 URL
    return url;
  }
}

/** 异步版：额外将 QQ CDN 图片 URL 稳定化后用于 LLM 请求 */
export async function extractMessageContentAsync(items: MessageItem[]): Promise<BaseMessageContent[]> {
  const result: BaseMessageContent[] = [];
  await appendItemsAsync(result, items, 0);
  return result;
}

/** 异步：逐条解析消息段，遇 forward/node 递归展开（图片 URL 做稳定化） */
async function appendItemsAsync(result: BaseMessageContent[], items: MessageItem[], depth: number): Promise<void> {
  if (depth > MAX_FLATTEN_DEPTH) return;
  for (const item of items) {
    switch (item.type) {
      case 'text':
        result.push({ type: 'text', text: item.data.text });
        break;
      case 'image':
        result.push({ type: 'image', url: await stabilizeImageUrl(item.data.url) });
        break;
      case 'record':
        result.push({ type: 'audio', url: item.data.url });
        break;
      case 'video':
        result.push({ type: 'video', url: item.data.url });
        break;
      case 'forward':
        await appendItemsAsync(result, toItemArray(item.data.content), depth + 1);
        break;
      case 'node':
        await appendItemsAsync(result, toItemArray(item.data.content), depth + 1);
        break;
    }
  }
}



