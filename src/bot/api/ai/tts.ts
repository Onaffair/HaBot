import { AIRequestManager, BaseMessage } from "@/adapter/ai";
import { MessageItemType } from "@/interface/MessageSendType";
import { extractMessageContent } from "./llm";





export const getAITTS = async (message:MessageItemType[]):Promise<Buffer> =>{
  const messages:BaseMessage[] = [
    {
      role:'user',
      content: extractMessageContent(message)
    }
  ]
  try {
    return await AIRequestManager.getInstance().sendMessage('ChatTTS', messages);
  } catch (e) {
    console.log("ttsError", e);
    return null;
  }

}
