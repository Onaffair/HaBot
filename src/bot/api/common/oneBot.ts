
import { OB11GroupMember, OBResponse } from '@/interface/onebot'
import axios, { AxiosRequestConfig } from 'axios'

const request = axios.create({
  baseURL: process.env.HTTP_BASE_URL,
  timeout: 30000,
})
request.defaults.headers['Authorization'] = process.env.HTTP_TOKEN
request.interceptors.request.use(c => {
  return c
})
request.interceptors.response.use(
  res => {
    const obResponse = res.data as OBResponse
    if (obResponse.status !== 'ok') {
      return Promise.reject(obResponse?.message)
    }
    return obResponse.data
  },
  err => Promise.reject(err.message)
)

function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.get<any, T>(url, config)
}
function post<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return request.post<any, T>(url, data, config)
}

// ============================================================================
// OneBot API — NapCat 适配
// 所有方法均为 static，统一使用 axios 实例 (baseURL + Authorization 已配置)
// 响应格式: { status: 'ok'|'failed', retcode: number, data: any, message: string, wording: string }
// ============================================================================

class OneBot {
  // ========================================================================
  // 消息接口
  // ========================================================================

  /** 发送私聊消息 */
  static sendPrivateMsg(params: {
    user_id: string | number,
    message: any,
    auto_escape?: boolean | string,
    source?: string,
    summary?: string,
    prompt?: string,
    timeout?: number,
  }) {
    return post('/send_private_msg', params)
  }

  /** 发送群消息 */
  static sendGroupMsg(params: {
    group_id: string | number,
    message: any,
    auto_escape?: boolean | string,
    source?: string,
    summary?: string,
    prompt?: string,
    timeout?: number,
  }) {
    return post('/send_group_msg', params)
  }

  /** 发送消息 (自动识别私聊/群聊) */
  static sendMsg(params: {
    message_type?: 'private' | 'group',
    user_id?: string | number,
    group_id?: string | number,
    message: any,
    auto_escape?: boolean | string,
    timeout?: number,
  }) {
    return post('/send_msg', params)
  }

  /** 撤回消息 */
  static deleteMsg(params: { message_id: number }) {
    return post('/delete_msg', params)
  }

  /** 获取消息 */
  static getMsg(params: { message_id: number }) {
    return post('/get_msg', params)
  }

  /** 获取合并转发消息 */
  static getForwardMsg(params: { id: string }) {
    return post('/get_forward_msg', params)
  }

  /** 发送合并转发消息 (群聊) */
  static sendGroupForwardMsg(params: { group_id: string | number, data: any }) {
    return post('/send_group_forward_msg', params)
  }

  /** 发送合并转发消息 (私聊) */
  static sendPrivateForwardMsg(params: { user_id: string | number, data: any }) {
    return post('/send_private_forward_msg', params)
  }

  /** 转发单条消息 */
  static forwardMsg(params: {
    message_id?: number,
    user_id?: string | number,
    group_id?: string | number,
  }) {
    return post('/forward_msg', params)
  }

  /** 转发单条消息 (指定目标) */
  static forwardSingleMsg(params: {
    message_id: number,
    user_id?: string | number,
    group_id?: string | number,
  }) {
    return post('/forward_msg', params)
  }

  /** 标记群聊已读 */
  static markGroupMsgAsRead(params: { group_id: string | number }) {
    return post('/mark_group_msg_as_read', params)
  }

  /** 标记私聊已读 */
  static markPrivateMsgAsRead(params: { user_id: string | number }) {
    return post('/mark_private_msg_as_read', params)
  }

  /** 标记所有消息已读 */
  static markAllMsgAsRead() {
    return post('/mark_all_msg_as_read')
  }

  // ========================================================================
  // 群组接口
  // ========================================================================

  /** 获取群列表 */
  static getGroupList() {
    return post('/get_group_list')
  }

  /** 获取群信息 */
  static getGroupInfo(params: { group_id: string | number, no_cache?: boolean | string }) {
    return post('/get_group_info', params)
  }

  /** 获取群详细信息 */
  static getGroupInfoEx(params: { group_id: string | number }) {
    return post('/get_group_info_ex', params)
  }

  /** 获取群成员列表 */
  static getGroupMemberList(params: { group_id: string | number, no_cache?: boolean | string }) {
    return post<OB11GroupMember[]>('/get_group_member_list', params)
  }
  /** 获取群成员信息 */
  static getGroupMemberInfo(params: {
    group_id: string | number,
    user_id: string | number,
    no_cache?: boolean | string,
  }) {
    return post('/get_group_member_info', params)
  }

  /** 群组踢人 */
  static setGroupKick(params: {
    group_id: string | number,
    user_id: string | number,
    reject_add_request?: boolean | string,
  }) {
    return post('/set_group_kick', params)
  }

  /** 群组禁言 */
  static setGroupBan(params: {
    group_id: string | number,
    user_id: string | number,
    duration?: number | string,
  }) {
    return post('/set_group_ban', params)
  }

  /** 获取群禁言列表 */
  static getGroupShutList(params: { group_id: string | number }) {
    return post('/get_group_shut_list', params)
  }

  /** 全员禁言 */
  static setGroupWholeBan(params: {
    group_id: string | number,
    enable?: boolean | string,
  }) {
    return post('/set_group_whole_ban', params)
  }

  /** 设置群管理员 */
  static setGroupAdmin(params: {
    group_id: string | number,
    user_id: string | number,
    enable?: boolean | string,
  }) {
    return post('/set_group_admin', params)
  }

  /** 设置群名片 */
  static setGroupCard(params: {
    group_id: string | number,
    user_id: string | number,
    card?: string,
  }) {
    return post('/set_group_card', params)
  }

  /** 设置群名称 */
  static setGroupName(params: { group_id: string | number, group_name: string }) {
    return post('/set_group_name', params)
  }

  /** 退出群组 */
  static setGroupLeave(params: {
    group_id: string | number,
    is_dismiss?: boolean | string,
  }) {
    return post('/set_group_leave', params)
  }

  /** 设置专属头衔 */
  static setGroupSpecialTitle(params: {
    group_id: string | number,
    user_id: string | number,
    special_title?: string,
    duration?: number | string,
  }) {
    return post('/set_group_special_title', params)
  }

  /** 处理加群请求/邀请 */
  static setGroupAddRequest(params: {
    flag: string,
    sub_type?: string,
    approve?: boolean | string,
    reason?: string,
  }) {
    return post('/set_group_add_request', params)
  }

  /** 获取群公告 */
  static getGroupNotice(params: { group_id: string | number }) {
    return post('/get_group_notice', params)
  }

  /** 发送群公告 (Go-CQHTTP) */
  static sendGroupNotice(params: {
    group_id: string | number,
    content: string,
    image?: string,
  }) {
    return post('/_send_group_notice', params)
  }

  /** 删除群公告 */
  static deleteGroupNotice(params: { group_id: string | number, notice_id: string }) {
    return post('/delete_group_notice', params)
  }

  /** 获取群精华消息列表 */
  static getEssenceMsgList(params: { group_id: string | number }) {
    return post('/get_essence_msg_list', params)
  }

  /** 设置精华消息 */
  static setEssenceMsg(params: { message_id: number }) {
    return post('/set_essence_msg', params)
  }

  /** 移出精华消息 */
  static deleteEssenceMsg(params: { message_id: number }) {
    return post('/delete_essence_msg', params)
  }

  /** 获取群历史消息 */
  static getGroupMsgHistory(params: {
    group_id: string | number,
    message_seq?: number,
    count?: number,
  }) {
    return post('/get_group_msg_history', params)
  }

  /** 获取群艾特全体剩余次数 */
  static getGroupAtAllRemain(params: { group_id: string | number }) {
    return post('/get_group_at_all_remain', params)
  }

  /** 获取群荣誉信息 (Go-CQHTTP) */
  static getGroupHonorInfo(params: {
    group_id: string | number,
    type?: string,
  }) {
    return post('/get_group_honor_info', params)
  }

  /** 获取群系统消息 */
  static getGroupSystemMsg() {
    return post('/get_group_system_msg')
  }

  /** 获取群被忽略的加群请求 */
  static getGroupIgnoredNotifies(params: { group_id: string | number }) {
    return post('/get_group_ignored_notifies', params)
  }

  /** 群打卡 */
  static sendGroupSign(params: { group_id: string | number }) {
    return post('/send_group_sign', params)
  }

  /** 获取群组今日打卡列表 */
  static getGroupSignList(params: { group_id: string | number }) {
    return post('/get_group_sign_list', params)
  }

  /** 设置群待办 */
  static setGroupTodo(params: {
    group_id: string | number,
    message_id: number,
  }) {
    return post('/set_group_todo', params)
  }

  /** 完成群待办 */
  static finishGroupTodo(params: {
    group_id: string | number,
    message_id: number,
  }) {
    return post('/finish_group_todo', params)
  }

  /** 取消群待办 */
  static cancelGroupTodo(params: {
    group_id: string | number,
    message_id: number,
  }) {
    return post('/cancel_group_todo', params)
  }

  // ========================================================================
  // 群组扩展
  // ========================================================================

  /** 设置群备注 */
  static setGroupRemark(params: { group_id: string | number, remark: string }) {
    return post('/set_group_remark', params)
  }

  /** 设置群加群选项 */
  static setGroupJoinOption(params: {
    group_id: string | number,
    option: string,
    value: any,
  }) {
    return post('/set_group_join_option', params)
  }

  /** 设置群机器人加群选项 */
  static setGroupBotJoinOption(params: {
    group_id: string | number,
    option: string,
    value: any,
  }) {
    return post('/set_group_bot_join_option', params)
  }

  /** 设置群搜索选项 */
  static setGroupSearchOption(params: {
    group_id: string | number,
    option: string,
    value: any,
  }) {
    return post('/set_group_search_option', params)
  }

  /** 获取群相册列表 */
  static getGroupAlbumList(params: { group_id: string | number }) {
    return post('/get_group_album_list', params)
  }

  /** 获取群相册媒体列表 */
  static getGroupAlbumMediaList(params: {
    group_id: string | number,
    album_id: string,
  }) {
    return post('/get_group_album_media_list', params)
  }

  /** 上传图片到群相册 */
  static uploadGroupAlbum(params: {
    group_id: string | number,
    album_id: string,
    file: string,
  }) {
    return post('/upload_group_album', params)
  }

  /** 点赞群相册媒体 */
  static likeGroupAlbumMedia(params: {
    group_id: string | number,
    media_id: string,
  }) {
    return post('/like_group_album_media', params)
  }

  /** 取消点赞群相册媒体 */
  static cancelLikeGroupAlbumMedia(params: {
    group_id: string | number,
    media_id: string,
  }) {
    return post('/cancel_like_group_album_media', params)
  }

  /** 发表群相册评论 */
  static commentGroupAlbum(params: {
    group_id: string | number,
    media_id: string,
    content: string,
  }) {
    return post('/comment_group_album', params)
  }

  /** 删除群相册媒体 */
  static deleteGroupAlbumMedia(params: {
    group_id: string | number,
    media_id: string,
  }) {
    return post('/delete_group_album_media', params)
  }

  // ========================================================================
  // 用户接口
  // ========================================================================

  /** 获取好友列表 */
  static getFriendList() {
    return post('/get_friend_list')
  }

  /** 获取陌生人信息 */
  static getStrangerInfo(params: {
    user_id: string | number,
    no_cache?: boolean | string,
  }) {
    return post('/get_stranger_info', params)
  }

  /** 点赞 */
  static sendLike(params: { user_id: string | number, times?: number }) {
    return post('/send_like', params)
  }

  /** 处理加好友请求 */
  static setFriendAddRequest(params: {
    flag: string,
    approve?: boolean | string,
    remark?: string,
  }) {
    return post('/set_friend_add_request', params)
  }

  /** 删除好友 */
  static deleteFriend(params: { user_id: string | number }) {
    return post('/delete_friend', params)
  }

  /** 设置好友备注 */
  static setFriendRemark(params: {
    user_id: string | number,
    remark: string,
  }) {
    return post('/set_friend_remark', params)
  }

  // ========================================================================
  // 用户扩展
  // ========================================================================

  /** 获取带分组的好友列表 */
  static getFriendsListWithCategory() {
    return post('/get_friends_list_with_category')
  }

  /** 获取单向好友列表 */
  static getUnidirectionalFriendList() {
    return post('/get_unidirectional_friend_list')
  }

  /** 获取资料点赞 */
  static getProfileLikeInfo(params: { user_id: string | number }) {
    return post('/get_profile_like_info', params)
  }

  // ========================================================================
  // 文件接口
  // ========================================================================

  /** 获取图片信息 */
  static getImage(params: { file: string }) {
    return post('/get_image', params)
  }

  /** 获取语音信息 */
  static getRecord(params: { file: string, out_format?: string }) {
    return post('/get_record', params)
  }

  /** 获取文件信息 */
  static getFile(params: { file: string }) {
    return post('/get_file', params)
  }

  /** 获取群文件 URL */
  static getGroupFileUrl(params: {
    group_id: string | number,
    file_id: string,
  }) {
    return post('/get_group_file_url', params)
  }

  /** 获取私聊文件 URL */
  static getPrivateFileUrl(params: {
    user_id: string | number,
    file_id: string,
  }) {
    return post('/get_private_file_url', params)
  }

  /** 上传群文件 */
  static uploadGroupFile(params: {
    group_id: string | number,
    file: string,
    name: string,
    folder?: string,
  }) {
    return post('/upload_group_file', params)
  }

  /** 上传私聊文件 */
  static uploadPrivateFile(params: {
    user_id: string | number,
    file: string,
    name: string,
  }) {
    return post('/upload_private_file', params)
  }

  /** 获取群根目录文件列表 */
  static getGroupRootFiles(params: { group_id: string | number }) {
    return post('/get_group_root_files', params)
  }

  /** 获取群文件夹文件列表 */
  static getGroupFilesByFolder(params: {
    group_id: string | number,
    folder_id: string,
  }) {
    return post('/get_group_files_by_folder', params)
  }

  /** 创建群文件目录 */
  static createGroupFileFolder(params: {
    group_id: string | number,
    folder_name: string,
  }) {
    return post('/create_group_file_folder', params)
  }

  /** 删除群文件 */
  static deleteGroupFile(params: {
    group_id: string | number,
    file_id: string,
  }) {
    return post('/delete_group_file', params)
  }

  /** 删除群文件目录 */
  static deleteGroupFolder(params: {
    group_id: string | number,
    folder_id: string,
  }) {
    return post('/delete_group_folder', params)
  }

  /** 获取群文件系统信息 */
  static getGroupFileSystemInfo(params: { group_id: string | number }) {
    return post('/get_group_file_system_info', params)
  }

  /** 下载文件 (到本地临时目录) */
  static downloadFile(params: {
    url: string,
    thread_count?: number,
    headers?: Record<string, string>,
  }) {
    return post('/download_file', params)
  }

  /** 检查URL安全性 */
  static checkUrlSafely(params: { url: string }) {
    return post('/check_url_safely', params)
  }

  // ========================================================================
  // 文件扩展
  // ========================================================================

  /** 移动群文件 */
  static moveGroupFile(params: {
    group_id: string | number,
    file_id: string,
    parent_folder_id: string,
  }) {
    return post('/move_group_file', params)
  }

  /** 重命名群文件 */
  static renameGroupFile(params: {
    group_id: string | number,
    file_id: string,
    new_name: string,
  }) {
    return post('/rename_group_file', params)
  }

  /** 传输群文件 (复制) */
  static transferGroupFile(params: {
    group_id: string | number,
    file_id: string,
    target_group_id: string | number,
  }) {
    return post('/transfer_group_file', params)
  }

  /** 创建闪传任务 */
  static createFlashTransferTask(params: {
    file: string,
    name?: string,
  }) {
    return post('/create_flash_transfer_task', params)
  }

  /** 获取闪传文件列表 */
  static getFlashTransferFileList() {
    return post('/get_flash_transfer_file_list')
  }

  /** 获取闪传文件链接 */
  static getFlashTransferFileUrl(params: { fileSetId: string }) {
    return post('/get_flash_transfer_file_url', params)
  }

  /** 发送闪传消息 */
  static sendFlashTransferMsg(params: {
    group_id?: string | number,
    user_id?: string | number,
    fileSetId: string,
  }) {
    return post('/send_flash_transfer_msg', params)
  }

  /** 获取文件分享链接 */
  static getFileShareUrl(params: { file: string }) {
    return post('/get_file_share_url', params)
  }

  /** 获取文件集信息 */
  static getFileSetInfo(params: { fileSetId: string }) {
    return post('/get_file_set_info', params)
  }

  /** 获取在线文件消息 */
  static getOnlineFileMsg(params: { msgId: string, elementId: string }) {
    return post('/get_online_file_msg', params)
  }

  /** 发送在线文件 */
  static sendOnlineFile(params: {
    group_id?: string | number,
    user_id?: string | number,
    file: string,
  }) {
    return post('/send_online_file', params)
  }

  /** 发送在线文件夹 */
  static sendOnlineFolder(params: {
    group_id?: string | number,
    user_id?: string | number,
    folder: string,
  }) {
    return post('/send_online_folder', params)
  }

  /** 接收在线文件 */
  static acceptOnlineFile(params: { msgId: string, elementId: string }) {
    return post('/accept_online_file', params)
  }

  /** 拒绝在线文件 */
  static rejectOnlineFile(params: { msgId: string, elementId: string }) {
    return post('/reject_online_file', params)
  }

  /** 取消在线文件 */
  static cancelOnlineFile(params: { msgId: string, elementId: string }) {
    return post('/cancel_online_file', params)
  }

  /** 下载文件集 */
  static downloadFileSet(params: { fileSetId: string }) {
    return post('/download_file_set', params)
  }

  /** 获取文件集 ID */
  static getFileSetId(params: { file: string }) {
    return post('/get_file_set_id', params)
  }

  // ========================================================================
  // 系统接口
  // ========================================================================

  /** 获取登录号信息 */
  static getLoginInfo() {
    return post('/get_login_info')
  }

  /** 获取版本信息 */
  static getVersionInfo() {
    return post('/get_version_info')
  }

  /** 获取运行状态 */
  static getStatus() {
    return post('/get_status')
  }

  /** 是否可以发送图片 */
  static canSendImage() {
    return post('/can_send_image')
  }

  /** 是否可以发送语音 */
  static canSendRecord() {
    return post('/can_send_record')
  }

  /** 获取 Cookies */
  static getCookies(params?: { domain?: string }) {
    return get('/get_cookies', { params })
  }

  /** 获取 CSRF Token */
  static getCsrfToken() {
    return get('/get_csrf_token')
  }

  /** 获取登录凭证 */
  static getCredentials(params?: { domain?: string }) {
    return post('/get_credentials', params)
  }

  /** 获取 Packet 状态 */
  static getPacketStatus() {
    return post('/get_packet_status')
  }

  /** 清理缓存 */
  static cleanCache() {
    return post('/clean_cache')
  }

  /** 重启服务 */
  static restartService(params?: { delay?: number }) {
    return post('/restart_service', params)
  }

  /** 获取群系统消息 (独立接口) */
  static getGroupSystemMsgV2() {
    return post('/get_group_system_msg')
  }

  /** 获取自定义表情 */
  static getCustomFace(params?: { count?: number }) {
    return get('/fetch_custom_face', { params })
  }

  /** 获取自定义表情详情 */
  static getCustomFaceDetail(params: { face_id: string }) {
    return post('/get_custom_face_detail', params)
  }

  /** 添加自定义表情 */
  static addCustomFace(params: { file: string }) {
    return post('/add_custom_face', params)
  }

  /** 删除自定义表情 */
  static deleteCustomFace(params: { face_id: string }) {
    return post('/delete_custom_face', params)
  }

  /** 修改自定义表情描述 */
  static updateCustomFaceDesc(params: {
    face_id: string,
    description: string,
  }) {
    return post('/update_custom_face_desc', params)
  }

  // ========================================================================
  // 系统扩展
  // ========================================================================

  /** 获取扩展 RKey */
  static getExtRKey() {
    return post('/get_ext_rkey')
  }

  /** 获取 RKey 服务器 */
  static getRKeyServer() {
    return post('/get_rkey_server')
  }

  /** 获取 RKey */
  static getRKey() {
    return post('/get_rkey')
  }

  /** 设置在线状态 */
  static setOnlineStatus(params: { code: number }) {
    return post('/set_online_status', params)
  }

  /** 设置输入状态 */
  static setInputStatus(params: {
    user_id: string | number,
    status?: string,
  }) {
    return post('/set_input_status', params)
  }

  /** 获取用户在线状态 */
  static getUserOnlineStatus(params: { user_id: string | number }) {
    return post('/get_user_online_status', params)
  }

  /** 获取机器人 UIN 范围 */
  static getBotUinRange() {
    return post('/get_bot_uin_range')
  }

  /** 退出登录 */
  static logout() {
    return post('/logout')
  }

  /** 获取收藏列表 */
  static getFavoritesList(params?: {
    category?: string,
    count?: number,
  }) {
    return post('/get_favorites_list', params)
  }

  /** 创建收藏 */
  static createFavorite(params: {
    file: string,
    name?: string,
  }) {
    return post('/create_favorite', params)
  }

  /** 获取 ClientKey */
  static getClientKey() {
    return post('/get_client_key')
  }

  // ========================================================================
  // 扩展接口
  // ========================================================================

  /** 设置QQ头像 */
  static setQQAvatar(params: { file: string }) {
    return post('/set_qq_avatar', params)
  }

  /** 设置个性签名 */
  static setSelfLongNick(params: { long_nick?: string }) {
    return post('/set_self_long_nick', params)
  }

  /** 设置QQ资料 (Go-CQHTTP) */
  static setQQProfile(params: {
    nickname?: string,
    company?: string,
    email?: string,
    college?: string,
    personal_note?: string,
  }) {
    return post('/set_qq_profile', params)
  }

  /** 获取机型显示 */
  static getModelShow(params?: { model?: string }) {
    return post('/_get_model_show', params)
  }

  /** 设置机型 */
  static setModelShow(params: { model: string, model_show: string }) {
    return post('/_set_model_show', params)
  }

  /** 设置自定义在线状态 */
  static setCustomOnlineStatus(params: {
    status: string,
    ext?: string,
    face_id?: number,
  }) {
    return post('/set_custom_online_status', params)
  }

  /** 图片 OCR 识别 */
  static ocrImage(params: { image: string }) {
    return post('/ocr_image', params)
  }

  /** 图片 OCR 识别 (内部) */
  static ocrImageInternal(params: { image: string }) {
    return post('/ocr_image_internal', params)
  }

  /** 英文单词翻译 */
  static translateEnWord(params: { words: string[] }) {
    return post('/translate_en_word', params)
  }

  /** 批量踢出群成员 */
  static batchSetGroupKick(params: {
    group_id: string | number,
    user_ids: (string | number)[],
  }) {
    return post('/batch_set_group_kick', params)
  }

  /** 获取 AI 角色列表 */
  static getAiCharacters(params: { group_id: string | number }) {
    return post('/get_ai_characters', params)
  }

  /** 获取在线客户端 */
  static getOnlineClients(params?: { no_cache?: boolean | string }) {
    return post('/get_online_clients', params)
  }

  /** 设置群头像 (Go-CQHTTP) */
  static setGroupPortrait(params: {
    group_id: string | number,
    file: string,
  }) {
    return post('/set_group_portrait', params)
  }

  /** 获取好友历史消息 */
  static getFriendMsgHistory(params: {
    user_id: string | number,
    message_seq?: number,
    count?: number,
  }) {
    return post('/get_friend_msg_history', params)
  }

  /** 处理快速操作 */
  static handleQuickAction(params: {
    context: any,
    operation: any,
  }) {
    return post('/handle_quick_action', params)
  }

  /** 发送原始数据包 */
  static sendPacket(params: {
    command: string,
    data: any,
  }) {
    return post('/send_packet', params)
  }

  /** 获取小程序 Ark */
  static getMiniAppArk(params: { app: string }) {
    return post('/get_mini_app_ark', params)
  }

  // ========================================================================
  // 消息扩展
  // ========================================================================

  /** 设置消息表情点赞 */
  static setMsgEmojiLike(params: {
    message_id: number,
    emoji_id: string,
    set?: boolean,
  }) {
    return post('/set_msg_emoji_like', params)
  }

  /** 获取表情点赞详情 */
  static getMsgEmojiLikeDetail(params: {
    message_id: number,
    emoji_id: string,
  }) {
    return post('/get_msg_emoji_like_detail', params)
  }

  /** 获取消息表情点赞列表 */
  static getMsgEmojiLikeList(params: { message_id: number }) {
    return post('/get_msg_emoji_like_list', params)
  }

  /** 获取语音转文字结果 */
  static getVoiceToTextResult(params: { voice_file: string }) {
    return post('/get_voice_to_text_result', params)
  }

  /** 分享群 (Ark) */
  static shareGroupArk(params: { group_id: string | number }) {
    return post('/share_group_ark', params)
  }

  /** 分享用户 (Ark) */
  static shareUserArk(params: { user_id: string | number }) {
    return post('/share_user_ark', params)
  }

  /** 点击内联键盘按钮 */
  static clickInlineKeyboard(params: {
    data: string,
    message_id?: number,
  }) {
    return post('/click_inline_keyboard', params)
  }

  /** 发送戳一戳 */
  static sendPoke(params: {
    user_id: string | number,
    group_id?: string | number,
  }) {
    return post('/send_poke', params)
  }

  // ========================================================================
  // 流式传输扩展
  // ========================================================================

  /** 清理流式传输临时文件 */
  static cleanStreamCache() {
    return post('/clean_stream_cache')
  }

  /** 下载语音文件流 */
  static downloadRecordStream(params: { file: string }) {
    return post('/download_record_stream', params)
  }

  /** 下载图片文件流 */
  static downloadImageStream(params: { file: string }) {
    return post('/download_image_stream', params)
  }

  /** 下载文件流 */
  static downloadFileStream(params: {
    url: string,
    headers?: Record<string, string>,
  }) {
    return post('/download_file_stream', params)
  }

  /** 上传文件流 */
  static uploadFileStream(params: {
    name: string,
    data: string,
  }) {
    return post('/upload_file_stream', params)
  }

  /** 测试下载流 */
  static testDownloadStream() {
    return post('/test_download_stream')
  }

  // ========================================================================
  // 频道接口
  // ========================================================================

  /** 获取频道列表 */
  static getGuildList() {
    return post('/get_guild_list')
  }

  /** 获取频道个人信息 */
  static getGuildProfile() {
    return post('/get_guild_profile')
  }

  // ========================================================================
  // AI 扩展
  // ========================================================================

  /** 获取 AI 语音 */
  static getAiRecord(params: {
    group_id: string | number,
    character: string,
    text: string,
    voice_type?: string,
  }) {
    return post('/get_ai_record', params)
  }

  /** 发送群 AI 语音 */
  static sendAiRecord(params: {
    group_id: string | number,
    character: string,
  }) {
    return post('/send_ai_record', params)
  }

  // ========================================================================
  // 系统接口 - 可疑好友申请
  // ========================================================================

  /** 获取可疑好友申请 */
  static getSuspiciousFriendRequests() {
    return post('/get_suspicious_friend_requests')
  }

  /** 处理可疑好友申请 */
  static handleSuspiciousFriendRequest(params: {
    flag: string,
    approve?: boolean,
  }) {
    return post('/handle_suspicious_friend_request', params)
  }
}


export default OneBot;
