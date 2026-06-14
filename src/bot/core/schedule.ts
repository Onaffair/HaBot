import { createLogger } from "@/utils/logger";

export interface Schedule {
  name: string,
  description?: string,
  delay: number,
  handle: () => void | Promise<void>
}
const logger = createLogger('Schedule')
export class ScheduleFactory {
  private static instance: ScheduleFactory;
  private map: Map<Schedule, NodeJS.Timeout>;

  private constructor() {
    this.map = new Map()
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ScheduleFactory()
    }
    return this.instance
  }

  registry(schedule: Schedule) {
    const { handle, delay } = schedule
    // 立即执行一次，然后定期执行
    handle()
    const timer = setInterval(handle, delay)
    this.map.set(schedule, timer)
    logger.info(`schedule ${schedule.name} registered`)
  }

  remove(schedule: Schedule) {
    const timer = this.map.get(schedule)
    if (timer) {
      clearInterval(timer)
    }
    this.map.delete(schedule)
  }
  getSchedules() {
    return Array.from(this.map.keys())
  }
}
