// ============================================================================
// OneBot 11 数据模型定义 (基于 NapCat API Schema)
// 参考: https://napcat.apifox.cn/llms.txt
// ============================================================================

// ---------------------------------------------------------------------------
// 基础类型
// ---------------------------------------------------------------------------

/** 文件消息段基础数据 */
export interface FileBaseData {
  file: string
  path?: string
  url?: string
  name?: string
  thumb?: string
}

/** API 响应 */
export type OBResponse<T = any> = {
  status: 'ok' | 'failed'
  retcode: number
  data?: T
  message?: string
  wording?: string
  stream?: 'stream-action' | 'normal-action'
}

/** 空数据 */
export type EmptyData = null

// ---------------------------------------------------------------------------
// 消息段类型 (Message Segment)
// ---------------------------------------------------------------------------

/** 纯文本消息段 */
export interface OB11MessageText {
  type: 'text'
  data: { text: string }
}

/** QQ 表情消息段 */
export interface OB11MessageFace {
  type: 'face'
  data: {
    id: string
    resultId?: string
    chainCount?: number
  }
}

/** 商城表情消息段 */
export interface OB11MessageMFace {
  type: 'mface'
  data: {
    emoji_package_id: number
    emoji_id: string
    key: string
    summary: string
  }
}

/** @ 消息段 */
export interface OB11MessageAt {
  type: 'at'
  data: {
    qq: string
    name?: string
  }
}

/** 回复消息段 */
export interface OB11MessageReply {
  type: 'reply'
  data: {
    id?: string
    seq?: number
  }
}

/** 图片消息段 */
export interface OB11MessageImage {
  type: 'image'
  data: {
    file: string
    path?: string
    url?: string
    name?: string
    thumb?: string
    summary?: string
    sub_type?: number
  }
}

/** 语音消息段 */
export interface OB11MessageRecord {
  type: 'record'
  data: FileBaseData
}

/** 视频消息段 */
export interface OB11MessageVideo {
  type: 'video'
  data: FileBaseData
}

/** 文件消息段 */
export interface OB11MessageFile {
  type: 'file'
  data: FileBaseData
}

/** ID 音乐消息段 (平台内置音乐) */
export interface OB11MessageIdMusic {
  type: 'music'
  data: {
    type: 'qq' | '163' | 'kugou' | 'migu' | 'kuwo'
    id: string | number
  }
}

/** 自定义音乐消息段 */
export interface OB11MessageCustomMusic {
  type: 'music'
  data: {
    type: 'custom'
    id: null
    url: string
    audio?: string
    title?: string
    image: string
    content?: string
  }
}

/** 戳一戳消息段 */
export interface OB11MessagePoke {
  type: 'poke'
  data: {
    type: string
    id: string
  }
}

/** 骰子消息段 */
export interface OB11MessageDice {
  type: 'dice'
  data: {
    result: number | string
  }
}

/** 猜拳消息段 */
export interface OB11MessageRPS {
  type: 'rps'
  data: {
    result: number | string
  }
}

/** 联系人消息段 */
export interface OB11MessageContact {
  type: 'contact'
  data: {
    type: 'qq' | 'group'
    id: string
  }
}

/** 位置消息段 */
export interface OB11MessageLocation {
  type: 'location'
  data: {
    lat: string | number
    lon: string | number
    title?: string
    content?: string
  }
}

/** JSON 消息段 */
export interface OB11MessageJson {
  type: 'json'
  data: {
    data: string | Record<string, any>
    config?: { token: string }
  }
}

/** XML 消息段 */
export interface OB11MessageXml {
  type: 'xml'
  data: {
    data: string
  }
}

/** Markdown 消息段 */
export interface OB11MessageMarkdown {
  type: 'markdown'
  data: {
    content: string
  }
}

/** 小程序消息段 */
export interface OB11MessageMiniApp {
  type: 'miniapp'
  data: {
    data: string
  }
}

/** 合并转发消息节点 */
export interface OB11MessageNode {
  type: 'node'
  data: {
    id?: string
    user_id?: number | string
    uin?: number | string
    nickname: string
    name?: string
    content: OB11MessageMixType
    source?: string
    news?: Array<{ text: string }>
    summary?: string
    prompt?: string
    time?: string
  }
}

/** 合并转发消息段 */
export interface OB11MessageForward {
  type: 'forward'
  data: {
    id: string
    content?: MessageItem[]
  }
}

/** 在线文件消息段 */
export interface OB11MessageOnlineFile {
  type: 'onlinefile'
  data: {
    msgId: string
    elementId: string
    fileName: string
    fileSize: string
    isDir: boolean
  }
}

/** QQ 闪传消息段 */
export interface OB11MessageFlashTransfer {
  type: 'flashtransfer'
  data: {
    fileSetId: string
  }
}

// ---------------------------------------------------------------------------
// 消息段联合类型
// ---------------------------------------------------------------------------

/** OneBot 11 消息段 */
export type MessageItem =
  | OB11MessageText
  | OB11MessageFace
  | OB11MessageMFace
  | OB11MessageAt
  | OB11MessageReply
  | OB11MessageImage
  | OB11MessageRecord
  | OB11MessageVideo
  | OB11MessageFile
  | OB11MessageIdMusic
  | OB11MessageCustomMusic
  | OB11MessagePoke
  | OB11MessageDice
  | OB11MessageRPS
  | OB11MessageContact
  | OB11MessageLocation
  | OB11MessageJson
  | OB11MessageXml
  | OB11MessageMarkdown
  | OB11MessageMiniApp
  | OB11MessageNode
  | OB11MessageForward
  | OB11MessageOnlineFile
  | OB11MessageFlashTransfer


/** OneBot 11 消息混合类型 (发送消息时可传此格式) */
export type OB11MessageMixType = MessageItem[] | string | MessageItem

// ---------------------------------------------------------------------------
// 发送者信息
// ---------------------------------------------------------------------------

/** OneBot 11 发送者信息 */
export interface OB11Sender {
  user_id: number | string
  nickname: string
  card?: string
  role?: string
  sex?: string
  age?: number
  area?: string
  level?: string
  title?: string
}

// ---------------------------------------------------------------------------
// 核心数据模型
// ---------------------------------------------------------------------------

/** 表情点赞项 */
export interface EmojiLikesItem {
  emoji_id: string
  emoji_type: string
  likes_cnt: string
}

/** OneBot 11 完整消息对象 */
export interface OB11Message {
  real_seq?: string
  temp_source?: number
  message_sent_type?: string
  target_id?: number
  self_id?: number
  time: number
  message_id: number
  message_seq: number
  real_id: number
  user_id: number | string
  group_id?: number | string
  group_name?: string
  message_type: 'private' | 'group'
  sub_type?: 'friend' | 'group' | 'normal'
  sender: OB11Sender
  message: MessageItem[] | string
  message_format: 'array' | 'string'
  raw_message?: string
  font?: number
  post_type?: string
  raw?: Record<string, any>
  emoji_likes_list?: EmojiLikesItem[]
}

/** 发送消息请求 */
export interface OB11PostSendMsg {
  message_type?: 'private' | 'group'
  user_id?: string
  group_id?: string
  message?: OB11MessageMixType
  messages?: OB11MessageMixType
  auto_escape?: boolean | string
}

/** OneBot 11 群成员信息 */
export interface OB11GroupMember {
  group_id: number
  user_id: number
  nickname: string
  card?: string
  sex?: string
  age?: number
  join_time?: number
  last_sent_time?: number
  level?: string
  qq_level?: number
  role?: string
  title?: string
  area?: string
  unfriendly?: boolean
  title_expire_time?: number
  card_changeable?: boolean
  shut_up_timestamp?: number
  is_robot?: boolean
  qage?: number
}

/** OneBot 11 群信息 */
export interface OB11Group {
  group_all_shut: number
  group_remark: string
  group_id: number
  group_name: string
  member_count?: number
  max_member_count?: number
}

/** OneBot 11 用户信息 */
export interface OB11User {
  birthday_year?: number
  birthday_month?: number
  birthday_day?: number
  phone_num?: string
  email?: string
  category_id?: number
  user_id: number
  nickname: string
  remark?: string
  sex?: string
  level?: number
  age?: number
  qid?: string
  login_days?: number
  categoryName?: string
  categoryId?: number
}

/** 最后一条消息 */
export interface OB11LatestMessage {
  self_id: number
  user_id: number
  time: number
  real_seq?: string
  message_type: string
  sender: {
    user_id: number
    nickname: string
    card?: string
    role?: string
  }
  raw_message: string
  font?: number
  sub_type: string
  message: any
  message_format: string
  post_type: string
  group_id: number
  group_name: string
}

/** 消息信息 (动作响应) */
export interface OB11ActionMessage {
  self_id: number
  user_id: number
  time: number
  real_seq: string
  message_type: string
  sender: {
    user_id: number
    nickname: string
    card?: string
    role?: string
  }
  raw_message: string
  font: number
  sub_type: string
  message: any
  message_format: string
  post_type: string
  group_id: number
  group_name: string
  message_id: number
  message_seq: number
  emoji_likes_list?: EmojiLikesItem[]
}

/** 通知信息 */
export interface OB11Notify {
  request_id: number
  invitor_uin: number
  invitor_nick: string
  group_id: number
  group_name: string
  message?: string
  checked: boolean
  actor: number
  requester_nick: string
}

// ---------------------------------------------------------------------------
// 项目自定义类型 (原 messageReceiveType.ts / MessageSendType.ts)
// ---------------------------------------------------------------------------

/** 群用户信息 (用于项目内部) */
export interface GroupUserInfo {
  group_id: number
  user_id: number
  nickname: string
  card: string
  sex: 'male' | 'female' | 'unknown'
  age: number
  area: string
  level: string
  qq_level: number
  join_time: number
  last_sent_time: number
  title_expire_time: number
  unfriendly: boolean
  card_changeable: boolean
  is_robot: boolean
  shut_up_timestamp: number
  role: 'owner' | 'admin' | 'member'
  title: string
}

/** 群消息发送负载 */
export interface GroupMessageSend {
  group_id?: string
  message?: MessageItem[]
}

/** OneBot 接收消息 (对应 WebSocket 推送的消息事件) */
export interface OneBotMessageReceive {
  self_id?: number
  user_id?: number
  time?: number
  message_id?: number
  message_seq?: number
  real_id?: number
  real_seq?: string
  message_type?: 'group' | 'private' | 'guild'
  sender?: {
    user_id?: number
    nickname?: string
    card?: string
    role?: 'admin' | 'owner' | 'member'
  }
  raw_message?: string
  font?: number
  sub_type?: string
  message?: Array<MessageItem>
  message_format?: 'array' | 'string'
  post_type?: string
  group_id?: number
  group_name?: string
}

/** OneBot 接收消息 (完整 NapCat 原始字段) */
export interface OneBotMessageReceiveRaw {
  msgId?: string
  msgRandom?: string
  msgSeq?: string
  cntSeq?: string
  chatType?: number
  msgType?: number
  subMsgType?: number
  sendType?: number
  senderUid?: string
  peerUid?: string
  channelId?: string
  guildId?: string
  guildCode?: string
  fromUid?: string
  fromAppid?: string
  msgTime?: string
  msgMeta?: Record<string, any>
  sendStatus?: number
  sendRemarkName?: string
  sendMemberName?: string
  sendNickName?: string
  guildName?: string
  channelName?: string
  elements?: Array<{
    elementType?: number
    elementId?: string
    elementGroupId?: number
    extBufForUI?: Record<string, any>
    textElement?: any
    faceElement?: any
    marketFaceElement?: any
    replyElement?: any
    picElement?: any
    pttElement?: any
    videoElement?: any
    grayTipElement?: any
    arkElement?: any
    fileElement?: any
    liveGiftElement?: any
    markdownElement?: any
    structLongMsgElement?: any
    multiForwardMsgElement?: any
    giphyElement?: any
    walletElement?: any
    inlineKeyboardElement?: any
    textGiftElement?: any
    calendarElement?: any
    yoloGameResultElement?: any
    avRecordElement?: any
    structMsgElement?: any
    faceBubbleElement?: any
    shareLocationElement?: any
    tofuRecordElement?: any
    taskTopMsgElement?: any
    recommendedMsgElement?: any
    actionBarElement?: any
    prologueMsgElement?: any
    forwardMsgElement?: any
  }>
  records?: any[]
  emojiLikesList?: any[]
  commentCnt?: string
  directMsgFlag?: number
  directMsgMembers?: any[]
  peerName?: string
  freqLimitInfo?: any
  editable?: boolean
  avatarMeta?: string
  avatarPendant?: string
  feedId?: string
  roleId?: string
  timeStamp?: string
  clientIdentityInfo?: any
  isImportMsg?: boolean
  atType?: number
  roleType?: number
  fromChannelRoleInfo?: { roleId?: string; name?: string; color?: number }
  fromGuildRoleInfo?: { roleId?: string; name?: string; color?: number }
  levelRoleInfo?: { roleId?: string; name?: string; color?: number }
  recallTime?: string
  isOnlineMsg?: boolean
  generalFlags?: Record<string, any>
  clientSeq?: string
  fileGroupSize?: any
  foldingInfo?: any
  multiTransInfo?: any
  senderUin?: string
  peerUin?: string
  msgAttrs?: Record<string, any>
  anonymousExtInfo?: any
  nameType?: number
  avatarFlag?: number
  extInfoForUI?: any
  personalMedal?: any
  categoryManage?: number
  msgEventInfo?: any
  sourceType?: number
  id?: number
}

// ---------------------------------------------------------------------------
// Helper 函数
// ---------------------------------------------------------------------------

/** 创建群消息发送实例 (内联类型避免循环依赖) */
export function getMessageSendTypeInstance(session: { groupId?: number }): GroupMessageSend {
  return {
    group_id: session.groupId?.toString(),
    message: [],
  }
}
