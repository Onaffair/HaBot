export interface VideoMeta {
  title: string,
  meta: {
    type: 'audio' | 'video',
    url: string
  }[]
}
export interface VideoPlatform {
  name: string,
  match: (text: string) => boolean,
  handle: (text: string) => Promise<{ title: string, path: string }>,
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

  hasAnyMatch(text: string): boolean {
    return this.list.some(t => t.match(text))
  }

  handle(text: string) {
    const platform = this.list.find(t => t.match(text))
    return platform.handle(text)
  }

}
