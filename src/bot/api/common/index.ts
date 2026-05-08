import request from '@/utils/comomnReq'

interface ImageReqParams {
  pid: string,
  pidli: string,
  pmod: string
}


export function getBGImage(params: ImageReqParams) {
  return request.post('https://alaan.top/ajax.php', new URLSearchParams({ ...params }))
}

