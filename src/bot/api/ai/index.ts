import { createAIRequest, getAIConfig } from "@/utils/aiRequest";
import { getAdapter } from "./adapters";
import { UnifiedMessage } from "./types";
import { Logger } from "@/utils/logger";
import { log } from "console";

/**
 * 发送 AI 消息。
 * 传入统一格式的聊天记录，内部根据平台配置选择适配器，
 * 将统一消息转换为平台请求体，发送后解析响应。
 *
 * @param messages  统一格式聊天记录
 * @param modelName 配置中 AI 条目的 name，不传则使用默认（第一个）
 * @param options   额外选项，会覆盖 body 模板中的同名字段
 * @returns         解析后的结果（LLM 返回文本字符串，图片生成返回 { url } 等）
 */
export async function sendAImessage(
  messages: UnifiedMessage[],
  modelName?: string,
  options?: Record<string, any>,
): Promise<any> {
  const aiConfig = getAIConfig(modelName);
  const adapter = getAdapter(aiConfig?.platform);

  if (!adapter) {
    console.warn(`[ai] 未找到平台 "${aiConfig?.platform}" 的适配器，回退到原始透传`);
    const req = createAIRequest(modelName);
    const body = { ...aiConfig?.body, messages, ...options };
    try {
      const res = await req({
        method: 'post',
        data: body,
        headers: {
          Authorization: `Bearer ${aiConfig?.secret}`
        }
      }) as any;
      return res?.choices?.[0]?.message?.content ?? '';
    } catch (e) {
      console.error('sendAImessage error:', e);
      return '';
    }
  }

  // 正常路径：通过适配器
  const reqBody = adapter.buildRequest(messages, aiConfig?.body ?? {}, options);
  console.log('[ai] 发送请求:', reqBody);
  const req = createAIRequest(modelName);
  try {
    const res = await req({
      method: 'post',
      data: reqBody,
      headers: {
        Authorization: `Bearer ${aiConfig?.secret}`
      }
    }) as any;
    return adapter.parseResponse(res);
  } catch (e) {
    console.error('sendAImessage error:', e);
    return '';
  }
}
