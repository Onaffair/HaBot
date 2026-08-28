import { Session } from "@/core/session";

export interface VideoMeta {
  title: string,
  meta: {
    type: 'audio' | 'video',
    url: string
  }[]
}
export interface VideoPlatform {
  name: string,
  match: (session: Session) => boolean,
  handle: (session: Session) => Promise<{ title: string, path: string }>,
}
/** 聚合纯文本与 json 消息段（小程序分享）中的链接 */
export function buildSpiderContent(session: Session): string {
  const parts = [session.textContent]
  for (const payload of session.jsonPayloads) {
    const url = payload?.meta?.detail_1?.qqdocurl
    if (typeof url === 'string') parts.push(url)
  }
  return parts.join(' ')
}
export class VideoSpider {
  private static instance: VideoSpider
  private list: Array<VideoPlatform>

  private constructor() {
    this.list = []
  }

  register(platform: VideoPlatform) {
    this.list.push(platform)
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new VideoSpider()
    }
    return this.instance
  }

  hasAnyMatch(session: Session): boolean {
    return this.list.some(t => t.match(session))
  }

  handle(session: Session) {
    const platform = this.list.find(t => t.match(session))
    return platform.handle(session)
  }

}
