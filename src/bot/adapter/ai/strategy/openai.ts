import { AIPlatform, AIRequestManager, BaseMessage } from "../type";

class OpenAIPlatform implements AIPlatform {
  name = 'openai'
  model = 'Pro/moonshotai/Kimi-K2.6'
  url = process.env.OPENAI_BASE_URL || 'https://api.siliconflow.cn/v1/chat/completions'
  secret = process.env.OPENAI_API_KEY || ''
  stream = false
  max_tokens = 100000

  adapter(messages: BaseMessage[]) {
    return {
      headers: {
        Authorization: `Bearer ${this.secret}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: this.model,
      messages: messages.map(message => {
        const { role, content } = message
        return {
          role,
          content: content
            .filter(({ type }) => ['text', 'image', 'audio'].includes(type))
            .map(t => {
              const { type } = t
              switch (type) {
                case 'text':
                  return { type, text: t.text }
                case 'image':
                  return { type: 'image_url', image_url: { url: t.url } }
                case "audio":
                  return { type: 'audio_url', audio_url: { url: t.url } }
                // case "video":
                //   return { type: 'video_url', video_url: { url: t.url } }
              }
            })
        }
      }),
        max_tokens: this.max_tokens,
        stream: this.stream,
      },
    }
  }

  parser(response: any) {
    const res: string = response?.choices?.[0]?.message?.content ?? '';
    const BOX_TAG_RE = /[<|]begin_of_box[>|]|[<|]end_of_box[>|]/g;
    return res.replace(BOX_TAG_RE, '').trim()
  }
}

const fac = AIRequestManager.getInstance()
fac.registerPlatform(new OpenAIPlatform())
