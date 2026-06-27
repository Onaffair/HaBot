import { AIPlatform, AIRequestManager, BaseMessage, RequestOptions } from "../type";

class FishAudio implements AIPlatform {
  name = 'ChatTTS'
  url = process.env.FISHAUDIO_BASE_URL || 'https://api.fish.audio/v1/tts'
  secret = process.env.FISHAUDIO_API_KEY || ''
  model = 's2-pro'

  // 守岸人
  // private _referenceId = '1e7af7fae6504e1984e18d5c428591dc';
  //尤诺
  private _referenceId = 'cab93dd5e1684a648dbfde02bff2c0dc'
  //冬木珂莱塔
  // private _referenceId = '609caeef49474b1493566e08263b09b9'
  adapter(text: string, options?: RequestOptions) {
    // 将所有 text 内容拼接为 TTS 输入文本
    // const text = messages
    //   .flatMap(msg => msg.content)
    //   .filter(c => c.type === 'text')
    //   .map(c => c.text)
    //   .join('\n')

    return {
      headers: {
        Authorization: `Bearer ${this.secret}`,
        'Content-Type': 'application/json',
        model: options?.aiOptions?.model ?? this.model,
      },
      body: {
        text,
        reference_id: this._referenceId,
        ...options?.aiOptions,
      },
    }
  }
  parser(response: any) {
    return response?.data ?? response
  }
}

const fac = AIRequestManager.getInstance()
fac.registerPlatform(new FishAudio())
