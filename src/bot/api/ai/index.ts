import { createAIRequest, getAIConfig } from "@/utils/aiRequest"

export async function sendAImessage(data: any, modelName?: string) {
  const req = createAIRequest(modelName)
  const conf = getAIConfig(modelName)
  
  console.log('send a message to ai',JSON.stringify(data?.messages || data));
  return req({
    method: 'post',
    data,
    headers: {
      Authorization: `Bearer ${conf?.secret}`
    }
  })
}