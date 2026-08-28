import { AIRequestManager } from "@ai";

export const getAITTS = async (text: string): Promise<Buffer | null> => {
  try {
    return await AIRequestManager.getInstance().sendMessage('ChatTTS', text);
  } catch (e) {
    console.log("ttsError", e);
    return null;
  }
}
