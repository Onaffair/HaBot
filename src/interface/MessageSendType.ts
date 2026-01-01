import { Session } from "./session"

export interface MessageItemType {
  type: 'text' | 'image' | 'at' | 'record'  | 'reply' | 'voice' | 'video',
  data: {
    text?: string,
    file?: string,
    qq?: string,
    id?:string,
    url?: string
  }
}
export interface MessageSendType{
  group_id?: string,
  message?: MessageItemType[],
}
export function getMessageSendTypeInstance(session:Session): MessageSendType {
  return {
    group_id: session.groupId.toString(),
    message: [],
  }
}
