import request from '@/utils/request'

export function getImage(count = 100) {
  return request({
    url: '/fetch_custom_face',
    params: {
      count
    }
  })
}

export function postMessage(data: any) {
  return request({
    url: '/send_group_msg',
    method: 'post',
    data
  })
}

export function getGourpMembers(groupId: string | number) {
  return request({
    url: '/get_group_member_list',
    method: 'post',
    params: {
      group_id: groupId,
      nocache: false
    }
  })
}


export function getGroupMessage(group_id: number,count:number = 100) {
  return request({
    url: '/get_group_msg_history',
    method: 'post',
    data: {
      group_id,
      count,
    }
  })
}



export function getMessageById(message_id: number) {
  return request({
    url: '/get_msg',
    method: 'post',
    data: {
      message_id
    }
  })
}


