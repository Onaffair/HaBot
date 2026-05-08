
import { Session } from "./session"
import { Message } from "./messageReceiveType"


export interface GroupUserInfoType {
  group_id: number;          // 群组 ID
  user_id: number;           // 用户唯一 ID
  nickname: string;          // 昵称
  card: string;              // 群名片/备注
  sex: 'male' | 'female' | 'unknown'; // 性别，根据数据推断建议使用联合类型
  age: number;               // 年龄
  area: string;              // 地区
  level: string;             // 等级（注意数据中是字符串 '20'）
  qq_level: number;          // QQ 等级
  join_time: number;         // 入群时间戳
  last_sent_time: number;    // 最后发言时间戳
  title_expire_time: number; // 头衔过期时间戳
  unfriendly: boolean;       // 是否是不友好用户
  card_changeable: boolean;  // 名片是否可修改
  is_robot: boolean;         // 是否为机器人
  shut_up_timestamp: number; // 禁言截止时间戳
  role: 'owner' | 'admin' | 'member'; // 角色：群主/管理员/成员
  title: string;             // 专属头衔
}



export interface MessageItemType {
  type: 'text' | 'image' | 'at' | 'record' | 'reply' | 'voice' | 'video' | 'forward',
  data: {
    text?: string,
    file?: string,
    qq?: string,
    id?: string | number,
    url?: string,
    content?: Array<Message>
  }
}
export interface MessageSendType {
  group_id?: string,
  message?: MessageItemType[],
}
export function getMessageSendTypeInstance(session: Session): MessageSendType {
  return {
    group_id: session.groupId.toString(),
    message: [],
  }
}
