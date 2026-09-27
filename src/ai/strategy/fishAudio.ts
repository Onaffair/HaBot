import { AIPlatform, AIRequestOptions } from "../types";
import { AIRequestManager } from "../manager";
import { configService } from '@/services/db/systemConfig';

class FishAudio implements AIPlatform {
  name = 'ChatTTS'
  model = 's2-pro'
  /** 取值改为访问器：每次请求实时读配置，DB 改动即刻生效 */
  get url() {
    return configService.get('FISHAUDIO_BASE_URL', 'https://api.fish.audio/v1/tts')
  }
  get secret() {
    return configService.get('FISHAUDIO_API_KEY', '')
  }

  // 平台内置默认 axios 配置：二进制音频响应（代理由 manager 统一注入全局 AI 代理）
  axiosConfig = {
    responseType: 'arraybuffer' as const,
  }

  // 守岸人
  // private _referenceId = '1e7af7fae6504e1984e18d5c428591dc';
  //尤诺
  private _referenceId = 'cab93dd5e1684a648dbfde02bff2c0dc'
  //冬木珂莱塔
  // private _referenceId = '609caeef49474b1493566e08263b09b9'
  adapter(text: string, options?: AIRequestOptions) {
    return {
      headers: {
        Authorization: `Bearer ${this.secret}`,
        'Content-Type': 'application/json',
        model: options?.model ?? this.model,
      },
      body: {
        text,
        reference_id: this._referenceId,
        ...options,
      },
    }
  }
  parser(response: any) {
    return response?.data ?? response
  }
}

const fac = AIRequestManager.getInstance()
fac.registerPlatform(new FishAudio())
