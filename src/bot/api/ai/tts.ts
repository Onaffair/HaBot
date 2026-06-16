import { AIRequestManager, BaseMessage } from "@/adapter/ai";
import { MessageItemType } from "@/interface/MessageSendType";
import { extractMessageContent } from "./llm";





export const getAITTS = async (text:string):Promise<Buffer> =>{
  try {
    return await AIRequestManager.getInstance().sendMessage('ChatTTS', text);
  } catch (e) {
    console.log("ttsError", e);
    return null;
  }

}
