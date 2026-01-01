import config from "@/bot.config"

export interface AIMessageType {
  model: string,
  stream: boolean,
  max_toekns: number,
  temperature: number,
  messages: Array<{
    role: 'system' | 'user' | 'assistant',
    content:
    { type: 'text', text: string } |
    { type: 'image_url', image_url: { url: string }} |
    { type: 'audio_url', audio_url: { url: string }} |
    { type: 'video_url', video_url: { url: string }}
  }>
}
export function getAIMessageInstance() {
  return JSON.parse(JSON.stringify(config.ai.body))
}