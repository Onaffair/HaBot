import { downloadFromUrl, getVideoMetaInfo, getVideoUrl } from "@/api/common/online";
import { VideoMeta, VideoPlatform, VideoSpider } from "../type";
import { createLogger } from "@/utils/logger";
import { FFmpegTool } from "@/utils/ffmepg";


const logger = createLogger('BilibiliPlatform')
class BilibiliPlatform implements VideoPlatform {
  name = 'bilibili'
  headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh-CN,zh;q=0.9,en-GB;q=0.8,en-US;q=0.7,en;q=0.6',
    'cache-control': 'no-cache',
    'cookie': "buvid3=9F9AE6D1-139C-56E2-088C-81B6A14E35B094100infoc; b_nut=1712159894; i-wanna-go-back=-1; b_ut=7; _uuid=CCD10D64C-87ED-10CF6-8ABF-E2A72F19231B93086infoc; enable_web_push=DISABLE; rpdid=|(JuR|uuk)~0J'u~ukulmmuu; CURRENT_BLACKGAP=0; buvid4=676BAA7A-A4B6-E5F4-3AAC-362EAF5DB6EC95664-024040315-WtDcT12Y%2BmaSMHWXnTJADg%3D%3D; FEED_LIVE_VERSION=V_WATCHLATER_PIP_WINDOW; header_theme_version=CLOSE; buvid_fp_plain=undefined; DedeUserID=272798593; DedeUserID__ckMd5=f7ab0ac189795323; LIVE_BUVID=AUTO4317173515853049; CURRENT_FNVAL=4048; SESSDATA=6df4618a%2C1741180522%2C9cee9%2A92CjDl6HPcLANAL3tG8HjqupakiTslIMKeRxBFS4mZW-HUG4Itpzg0fa1b7oZ3tWZjfcASVllNYkRCc1Y4dVpzdEVkNnBFNXZwS2h1YmFLU1Nha3NXQ0Uyc01INnN3aTRlaURKRnhvS253R3FEQUhLNHNYczdPam4tYWFwZTdRZTAxWHNkNVNFY2lBIIEC; bili_jct=9e25a6f7334db8559a8d4f3eaff660bc; sid=7uaa1ab3; fingerprint=89fcfc0c3a0332c5403dd6213c0b0f24; CURRENT_QUALITY=64; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3Mjk1MTY5NTUsImlhdCI6MTcyOTI1NzY5NSwicGx0IjotMX0.sjLV0J-mu9XkwretxhO-3AarsCXiqQw2fiD32efwot0; bili_ticket_expires=1729516895; PVID=7; buvid_fp=0a9c58cb99860dd7afc9b0ea20de9c7c; home_feed_column=5; b_lsid=AA93F1DC_192A5E224F7; bmg_af_switch=1; bmg_src_def_domain=i1.hdslb.com; bp_t_offset_272798593=990082982129696768; browser_resolution=1920-953",
    'pragma': 'no-cache',
    'priority': 'u=0, i',
    'referer': 'https://www.bilibili.com/',
    'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  }

  match(text) {
    return [
      'https://b23.tv/',
      'https://www.bilibili.com/video',
    ].some(t => text.includes(t))
  }

  async handle(content): Promise<{ title: string, path: string }> {
    let text = content
    if (text.includes('https://b23.tv/')) {
      const redReg = /https?:\/\/b23\.tv\/[A-Za-z0-9]+/
      const match = text.match(redReg)
      const url = match ? match?.[0] : null
      if (!url) return
      const redirectRes = await downloadFromUrl(url,
        {
          maxRedirects: 0,
          validateStatus: (status) => status >= 300 && status < 400,
        }
      )
      text = redirectRes
    }
    const bvidReg = /https:\/\/www\.bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/
    const match = text.match(bvidReg)
    const bvid = match ? match[1] : null
    if (!bvid) return null
    logger.info(`Find Bvid ${bvid}`)
    const metaRes = await getVideoMetaInfo(bvid)
    // logger.info(JSON.stringify(metaRes))
    const { cid, title } = metaRes?.data
    const videoRes = await getVideoUrl({ bvid, cid, fnval: 4048, qn: 80, fourk: 1 }, { headers: this.headers })
    const { data } = videoRes
    const { dash } = data
    const { video, audio } = dash
    const [{ baseUrl: videoUrl }] = video
    const [{ baseUrl: audioUrl }] = audio

    const [videoBuffer, audioBuffer] = await Promise.all(
      [
        downloadFromUrl(videoUrl, { responseType: 'arraybuffer', headers: this.headers }) as Promise<Buffer>,
        downloadFromUrl(audioUrl, { responseType: 'arraybuffer', headers: this.headers }) as Promise<Buffer>
      ]
    )
    const ffmepg = FFmpegTool.getInstance()
    const path = await ffmepg.mergeAudioVideo(videoBuffer, audioBuffer, title)

    return {
      title,
      path
    }
  }
}
VideoSpider.getInstance().register(new BilibiliPlatform())


