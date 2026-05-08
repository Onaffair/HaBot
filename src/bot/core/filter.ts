import { Message } from "@/interface/messageReceiveType";

export interface Filter{
  name:string,
  match:(message:Message) => boolean,
  handle?:() => void,
  description?:string,
}

export const createFilter = (filter: Filter) => filter