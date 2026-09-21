import { createLogger } from '@utils/logger';
import request from '@/utils/webCrawlerRequest';
import md5 from '@/utils/md5';
import { AxiosRequestConfig } from 'axios';

const logger = createLogger('BGImage');


/**获取B站视频 */

//获取视频元信息
export async function getVideoMetaInfo(bvid: string) {
  return request.get('https://api.bilibili.com/x/web-interface/view',
    {
      params: { bvid },
    }
  )
}
// 获取播放地址
interface VideoUrlParams {
  bvid: string;
  cid: string;
  fnval?: number;
  qn?: number;
  fourk?: number;
}
export async function getVideoUrl(
  params: VideoUrlParams,
  options?: AxiosRequestConfig
) {
  //WBI签名
  // const queryString = [bvid, cid, fnval, qn, fourk, wts].join('&')
  // const img_key = 'd569546b86c252:db:9bc7e99c5d71e5'
  // const sub_key = '557251g796:g54:f:ee94g8fg969e2de'
  // const mixnKey = md5(img_key, sub_key)
  // const signStr = queryString + mixnKey
  // const w_rid = md5(signStr)

  return request.get('https://api.bilibili.com/x/player/wbi/playurl',
    {
      params,
      ...options
    }
  )
}
/**获取B站视频 */

// 资源获取
export async function downloadFromUrl(url: string, option: AxiosRequestConfig = {}): Promise<any> {
  return request.get(url,
    option
  )
}



