import { Session } from "@/core/session";
import { OneBotMessageReceive, MessageItem, GroupUserInfo } from "@/interface/onebot";
import axios from "axios";
import { ossService } from "@/utils/OSS";
import type { BaseMessage, BaseMessageContent } from "@ai";

// ========== 共享工具：将群聊消息项转换为统一内容格式 ==========
export function extractMessageContent(items: MessageItem[]): BaseMessageContent[] {
  const result: BaseMessageContent[] = [];
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
      case 'forward':
        result.push(...extractMessageContent(item.data.content ?? []))
        // if (item.data.content) {
          // for (const msg of item.data.content) {
          //   result.push(...extractMessageContent(msg ?? []));
          // }
        // }
        break;
    }
  }
  return result;
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
        result.push(...await extractMessageContentAsync(item.data.content ?? []));
        break;
    }
  }
  return result;
}



