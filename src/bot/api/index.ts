import request from '@/utils/request';
import { MessageItemType, GroupUserInfoType } from '@/interface/MessageSendType';
import { Message } from '@/interface/messageReceiveType';

// ========== API 函数 ==========

export function getImage(count = 100) {
  return request({ url: '/fetch_custom_face', params: { count } });
}

export function postMessage(data: any) {
  return request({ url: '/send_group_msg', method: 'post', data });
}

export async function getGourpMembers(groupId: string | number): Promise<GroupUserInfoType[]> {
  const res = await request({
    url: '/get_group_member_list',
    method: 'post',
    params: { group_id: groupId, nocache: false },
  });
  return res?.data as GroupUserInfoType[]
}

export async function getGroupMessage(
  group_id: number,
  count: number = 100,
){
  const res = await request({
    url: '/get_group_msg_history',
    method: 'post',
    data: { group_id, count },
  });
  return res?.data
}

export async function getMessageById(message_id: number){
  const res = await request({
    url: '/get_msg',
    method: 'post',
    data: { message_id },
  });
  return res?.data
}
