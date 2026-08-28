import { AIPlatform, AIRequestOptions, BaseMessage } from "../types";
import { AIRequestManager } from "../manager";

class ZhipuImagePlatform implements AIPlatform {
  name = 'zhipu'
  model = 'cogview-3-plus'
  url = process.env.ZHIPUAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/images/generations'
  secret = process.env.ZHIPUAI_API_KEY || ''

  adapter(messages: BaseMessage[], options?: AIRequestOptions) {
    // 图片生成没有 messages 概念，将所有 text 内容拼接为 prompt 字符串
    const prompt = messages
      .flatMap(msg => msg.content)
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')

    return {
      headers: {
        Authorization: `Bearer ${this.secret}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: this.model,
        prompt,
        ...options,
      },
    }
  }

  parser(response: any) {
    // 智谱 images/generations 返回格式: { data: [{ url: "..." }] }
    return response?.data?.[0] ?? { url: '' };
  }
}

const fac = AIRequestManager.getInstance()
fac.registerPlatform(new ZhipuImagePlatform())
