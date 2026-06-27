import { AIRequestManager } from "@/services/ai";
import type { RequestOptions } from "@/services/ai";

export const getAITTS = async (text: string): Promise<Buffer | null> => {
  try {
    const options: RequestOptions = {
      axiosConfig: {
        responseType: 'arraybuffer',
        ...(process.env.FISHAUDIO_PROXY_HOST
          ? {
            proxy: {
              protocol: 'http',
              host: process.env.FISHAUDIO_PROXY_HOST,
              port: Number(process.env.FISHAUDIO_PROXY_PORT) || 7897,
            },
          }
          : {}),
      },
    }
    return await AIRequestManager.getInstance().sendMessage('ChatTTS', text, options);
  } catch (e) {
    console.log("ttsError", e);
    return null;
  }
}
