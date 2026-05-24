import { Message } from "@/interface/messageReceiveType";

export interface Filter{
  name:string,
  match:(message:Message) => boolean,
  handle?:() => void,
  description?:string,
}
export const filters: Filter[] = []
export const createFilter = (filter: Filter) => {
  filters.push(filter)
  return filter
}