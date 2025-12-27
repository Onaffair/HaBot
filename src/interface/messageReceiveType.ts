export interface Message {
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
  sub_type?: 'normal' | 'notice' | 'recall' | 'group_upload' | 'poke' | string
  message?: Array<{
    type?: string
    data?: Record<string, any>
  }>
  message_format?: 'array' | 'string'
  post_type?: 'message' | 'request' | 'notice' | 'meta_event' | string
  group_id?: number
  group_name?: string
  raw?: {
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
      picElement?: {
        picSubType?: number
        fileName?: string
        fileSize?: string
        picWidth?: number
        picHeight?: number
        original?: boolean
        md5HexStr?: string
        sourcePath?: string
        thumbPath?: Record<string, any>
        transferStatus?: number
        progress?: number
        picType?: number
        invalidState?: number
        fileUuid?: string
        fileSubId?: string
        thumbFileSize?: number
        fileBizId?: any
        downloadIndex?: any
        summary?: string
        emojiFrom?: number
        emojiWebUrl?: string
        emojiAd?: {
          url?: string
          desc?: string
        }
        emojiMall?: {
          packageId?: number
          emojiId?: number
        }
        emojiZplan?: {
          actionId?: number
          actionName?: string
          actionType?: number
          playerNumber?: number
          peerUid?: string
          bytesReserveInfo?: string
        }
        originImageMd5?: string
        originImageUrl?: string
        import_rich_media_context?: any
        isFlashPic?: any
        storeID?: number
      } | null
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
    fromChannelRoleInfo?: {
      roleId?: string
      name?: string
      color?: number
    }
    fromGuildRoleInfo?: {
      roleId?: string
      name?: string
      color?: number
    }
    levelRoleInfo?: {
      roleId?: string
      name?: string
      color?: number
    }
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
}

