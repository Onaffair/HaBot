import { getAIMessageInstance } from "@/interface/AIMessage";
import { MessageItemType } from "@/interface/MessageSendType";
import { sendAImessage } from "..";


export async function generateImageByAI(message: MessageItemType[], option?: any) {
  function getPrompt() {
    return `
    我将分别从给出用户的聊天内容以及聊天总结，请你根据内容生成一张应景的图片，如果内容中出现了图片资源，请你参考总结
    中的内容它给出了对图片内容的描述:
    1、聊天内容
    ${JSON.stringify(message)}
    2、总结
    ${option?.summary}
    `
  }
  const body = getAIMessageInstance('image-generator')
  body.prompt = getPrompt()
  try {
    const res = await sendAImessage(body, 'image-generator')
    return res?.data?.[0]

  } catch (e) {
    console.log("imageErr", e?.message);
    return ''
  }
}






