import { createLogger } from '@utils/logger';
import request from '@/utils/webCrawlerRequest';
import md5 from '@/utils/md5';
import axios, { AxiosRequestConfig } from 'axios';

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
// 资源获取
export function downloadFromUrl(url: string, option: AxiosRequestConfig = {}): Promise<any> {
  return request.get(url,
    option
  )
}

/**
 * 跟随重定向抓取页面文本，返回最终地址与页面内容。
 * @remarks 统一 request 封装的拦截器只透出 data，短链还原必须拿到重定向后的最终 URL，
 *   故此处使用 axios 原始实例；失败直接抛出，由调用方决定降级策略。
 * @param url 目标地址（支持短链）
 * @param option 额外的 axios 配置（请求头、超时等）
 */
export async function fetchPageText(url: string, option: AxiosRequestConfig = {}) {
  const res = await axios.get(url, {
    timeout: 15000,
    responseType: 'text',
    maxRedirects: 5,
    ...option,
  })
  return {
    // responseUrl 为 axios 跟随重定向后的最终地址（node 适配器挂在 request.res 上）
    finalUrl: (res.request?.res?.responseUrl as string) || url,
    text: typeof res.data === 'string' ? res.data : String(res.data ?? ''),
  }
}



export function getDYJC() {
  return request.get(`https://yysrank.com/api/dyjc/get`)
}



