export interface MessageItemType {
  type: 'text' | 'image' | 'at',
  data: {
    text?: string,
    file?: string,
    qq?: string
  }
}
export interface MessageSendType{
  group_id?: string,
  message?: MessageItemType[],
}