export interface Entry {
  value: any,
  timer?: NodeJS.Timeout
}

export class Redis {
  private static instance: Redis;
  private map: Map<string, Entry>;
  private constructor() {
    this.map = new Map()
  }
  static getInstance() {
    if (!this.instance) {
      this.instance = new Redis()
    }
    return this.instance
  }
  set(key: string, value: any, delay?: number) {
    const old = this.get(key)

    const entry: Entry = { value }
    if (delay !== undefined) {
      if (old?.timer) {
        clearTimeout(old?.timer)
      }
      entry.timer = setTimeout(() => {
        this.remove(key)
      }, delay)
    }
    this.map.set(key, entry)
  }
  remove(key: string) {
    this.map.delete(key)
  }
  get(key: string) {
    return this.map.get(key)
  }
}