import { MessageItemType } from "./MessageSendType";




export type ActionResult =
  | { type: 'message'; items: MessageItemType[] }
  | { type: 'forward-message'; data: { messages: any[] } }
