import { Message } from "@/interface/messageReceiveType";
import { createLogger } from "@/utils/logger";

export interface Filter {
  name: string,
  match: (message: Message) => boolean,
  handle?: () => void,
  description?: string,
}
const logger = createLogger('Filter')
export class FilterFactory {
  private static instance: FilterFactory;
  private filters: Filter[];

  private constructor() {
    this.filters = []
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new FilterFactory()
    }
    return this.instance
  }

  registry(filter: Filter) {
    this.filters.push(filter)
    logger.info(`filter ${filter.name} registered`)
  }

  getFilters() {
    return this.filters
  }

  handleMessage(data: Message): boolean {
    return this.filters.every(filter => filter.match(data))
  }
}
