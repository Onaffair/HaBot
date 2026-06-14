import { AIPlatform, AIRequestManager, BaseMessage } from "../type";

class FishAudio implements AIPlatform {
  name = 'ChatTTS'
  url = process.env.FISHAUDIO_BASE_URL || 'https://api.fish.audio/v1/tts'
  secret = process.env.FISHAUDIO_API_KEY || ''
  model = 's2-pro'
  stream = false
  // 守岸人
  reference_id = '1e7af7fae6504e1984e18d5c428591dc';
  responseType = 'arraybuffer' as const;

  // 国外站点走本地 clash 代理
  proxy = process.env.FISHAUDIO_PROXY_HOST
    ? { protocol: 'http' as const, host: process.env.FISHAUDIO_PROXY_HOST, port: Number(process.env.FISHAUDIO_PROXY_PORT) || 7897 }
    : undefined
  adapter(messages: BaseMessage[]) {
    // 将所有 text 内容拼接为 TTS 输入文本
    const text = messages
      .flatMap(msg => msg.content)
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')
    return {
      headers: {
        Authorization: `Bearer ${this.secret}`,
        'Content-Type': 'application/json',
        model: this.model
      },
      body: {
        text,
        reference_id: this.reference_id,
      },
    }
  }
  parser(response: any) {
    return response?.data ?? response
  }
}

const fac = AIRequestManager.getInstance()
fac.registerPlatform(new FishAudio())
