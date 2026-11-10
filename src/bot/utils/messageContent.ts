import OneBot from "@/api/common/oneBot";
import { MessageItem, OB11MessageMixType } from "@/interface/onebot";
import type { BaseMessageContent } from "@ai";

// ============================================================================
// 消息段 -> LLM 统一内容格式 解析工具
//
// 自 api/ai/llm.ts 迁入 utils 工具层：解析逻辑与具体 AI 平台无关，属于
// 消息处理的通用能力。图片等媒体 URL 直接透传 message 中解析出的信息，
// 不再做异步的 QQ CDN 稳定化下载。
//
// 合并转发（forward / node）的内层内容有两种常见形态，都要能识别：
//  1. 只有 id 没有内联 content（尤其出现在「引用/回复了一条合并转发消息」
//     场景下 getMsg 拿到的原消息），必须再调一次 getForwardMsg / getMsg 补全，
//     也因此整个解析流程需要是异步的；
//  2. content 已内联下发，但数组元素不一定是标准 OneBot11 文档的
//     `{ type: 'node', data: { content } }` 段，而经常是「一条完整消息记录对象」
//     （带 sender/message_id 等字段，真正的消息段数组在其 `message` 字段里）；
//     不按这种形态识别的话会被当成非法消息段整段丢弃，导致转发消息内容
//     依然解析为空（详见 toItemArray / isMessageRecord）。
//
// 全部能力收敛为 MessageContentParser 的静态方法，无需实例化即可调用。
// ============================================================================

/** 递归展开的最大深度，防止畸形/循环数据导致无限递归 */
const MAX_FLATTEN_DEPTH = 10;

export class MessageContentParser {
  /**
   * 解析消息段列表为 LLM 统一内容格式：text/image/audio/video 直接透传 URL，
   * forward / node 递归展开其内层内容；内层未随消息段下发时按需异步补全。
   */
  static async extract(items: MessageItem[]): Promise<BaseMessageContent[]> {
    const result: BaseMessageContent[] = [];
    await this.appendItems(result, items, 0);
    return result;
  }

  /** 异步：逐条解析消息段，遇 forward/node 递归展开（内层缺失时按需拉取补全） */
  private static async appendItems(
    result: BaseMessageContent[],
    items: MessageItem[],
    depth: number,
  ): Promise<void> {
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
        // 合并转发：content 一般是若干 node；未内联下发时（只有 id）需另行拉取
        case 'forward': {
          let inner = this.toItemArray(item.data.content);
          if (inner.length === 0 && item.data.id) {
            inner = await this.fetchForwardNodes(item.data.id);
          }
          await this.appendItems(result, inner, depth + 1);
          break;
        }
        // 转发节点：真正的内层内容在 node.data.content 中，可能是文本/单条/数组/更深层 forward
        // 若节点只带 id（指向一条独立的原始消息），需再取一次 getMsg 补全
        case 'node': {
          let inner = this.toItemArray(item.data.content);
          if (inner.length === 0 && item.data.id) {
            inner = await this.fetchMsgItems(Number(item.data.id));
          }
          await this.appendItems(result, inner, depth + 1);
          break;
        }
      }
    }
  }

  /** 按合并转发 id 拉取内层消息段列表；拉取失败按「无内容」降级，不中断整体解析 */
  private static async fetchForwardNodes(id: string): Promise<MessageItem[]> {
    try {
      const res: any = await OneBot.getForwardMsg({ id });
      // 拦截器已解包 data，返回的一般是 { messages: [...] }；兼容直接返回数组的情况
      return this.toItemArray(res?.messages ?? res?.data?.messages ?? res);
    } catch {
      return [];
    }
  }

  /** 按单条消息 id 拉取其消息段列表；拉取失败按「无内容」降级，不中断整体解析 */
  private static async fetchMsgItems(messageId: number): Promise<MessageItem[]> {
    if (!messageId || Number.isNaN(messageId)) return [];
    try {
      const res: any = await OneBot.getMsg({ message_id: messageId });
      return this.toItemArray(res?.message);
    } catch {
      return [];
    }
  }

  /** 判断一个值是否为合法的消息段对象 */
  private static isMessageItem(value: unknown): value is MessageItem {
    return !!value && typeof value === 'object' &&
      typeof (value as { type?: unknown }).type === 'string';
  }

  /**
   * 判断一个值是否为「完整消息记录对象」——即形如收到事件 / getMsg 返回值的那种结构：
   * 顶层没有 `type`/`data`（不是消息段），而是带着 `sender`/`message_id`/`message` 等字段，
   * 真正的消息段数组藏在其 `message` 字段里。
   *
   * NapCat 的合并转发内联 content（以及 getForwardMsg 的 messages）在真实场景下经常是
   * 这种「每条内层消息 = 一个完整消息记录对象」的数组，而不是标准 OneBot11 文档里的
   * `[{ type: 'node', data: { content } }]` 段数组；不按这种形态识别的话，会被
   * isMessageItem 判定为非法消息段而整段丢弃，导致转发消息内容依然解析为空。
   */
  private static isMessageRecord(value: unknown): value is { message: OB11MessageMixType } {
    return !!value && typeof value === 'object' &&
      !('type' in (value as object)) &&
      'message' in (value as object);
  }

  /**
   * node / forward 的 content 可能是 纯文本字符串 / 单条消息段 / 消息段数组，
   * 也可能是「完整消息记录对象」或其数组（内层消息段藏在各自的 `message` 字段里），
   * 统一归一化为扁平的消息段数组以便递归展开。
   */
  private static toItemArray(content: OB11MessageMixType | readonly unknown[] | null | undefined): MessageItem[] {
    if (content == null) return [];
    if (typeof content === 'string') {
      // 纯文本型节点：拼成一个 text 消息段
      return content ? [{ type: 'text', data: { text: content } } as MessageItem] : [];
    }
    if (Array.isArray(content)) {
      const items: MessageItem[] = [];
      for (const el of content) {
        if (this.isMessageItem(el)) items.push(el);
        // 消息记录对象：下钻其 message 字段，继续按同一规则归一化（可能还嵌套更深转发）
        else if (this.isMessageRecord(el)) items.push(...this.toItemArray(el.message));
      }
      return items;
    }
    if (this.isMessageItem(content)) return [content];
    if (this.isMessageRecord(content)) return this.toItemArray(content.message);
    return [];
  }
}
