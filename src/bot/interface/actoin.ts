import { MessageItem } from "./onebot";


export type ActionResult =
  | { type: 'message'; items: MessageItem[] }
  | { type: 'forward-message'; data: { messages: any[] } }
