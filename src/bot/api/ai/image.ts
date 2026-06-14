import { MessageItemType } from "@/interface/MessageSendType";
import { AIRequestManager } from "@/adapter/ai";
import type { BaseMessage } from "@/adapter/ai";

/**
 * 根据聊天内容生成应景图片
 */
export async function generateImageByAI(message: MessageItemType[], option?: any): Promise<{ url: string }> {
  const promptText = `
    我将分别从给出用户的聊天内容以及聊天总结，请你根据内容生成一张应景的图片，如果内容中出现了图片资源，请你参考总结
    中的内容它给出了对图片内容的描述:
    1、聊天内容
    ${JSON.stringify(message)}
    2、总结
    ${option?.summary}
  `;

  const messages: BaseMessage[] = [
    { role: 'system', content: [{ type: 'text', text: promptText }] },
  ];
  try {
    return await AIRequestManager.getInstance().sendMessage('zhipu', messages);
  } catch (e) {
    console.log("imageErr", (e as any)?.message);
    return { url: '' };
  }
}
