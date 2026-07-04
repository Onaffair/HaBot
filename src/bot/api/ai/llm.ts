import { Session } from "@/interface/session";
import { OneBotMessageReceive, MessageItem, GroupUserInfo } from "@/interface/onebot";
import { AIRequestManager } from "@/services/ai";
import type { BaseMessage, BaseMessageContent } from "@/services/ai";

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



