import axios from 'axios';
import { createLogger } from '@utils/logger';

const logger = createLogger('BGImage');

interface ImageReqParams {
  pid: string;
  pidli: string;
  pmod: string;
}

/** 获取涩图 woman*/
export async function getBGImage(params: ImageReqParams) {
  try {
    const res = await axios.post(
      'https://alaan.top/ajax.php',
      new URLSearchParams({ ...params }),
      { timeout: 30000 },
    );
    return res?.data?.data?.map(t => t.img)?.flat();
  } catch (e: any) {
    logger.error('Failed to fetch BG image:', e?.message);
    return [];
  }
}
/** 获取涩图 man*/
export async function getBMImage(params: any) {
  try {
    const res = await axios.get('https://www.pexels.com/zh-cn/api/v3/getty-media/photos/muscular%20man', {
      params,
      headers: {
        'accept': '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'content-type': 'application/json',
        'cookie': 'active_experiment=none; _sp_ses.9ec1=*; country-code-v2=CN; _hjSession_171201=eyJpZCI6IjU3Mjc4ZDA3LTYyYTYtNDJjOS04MTNlLWUxODk2NjBkOTc4MCIsImMiOjE3ODEyNzE4MjQxNjcsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjoxLCJzcCI6MH0=; _fbp=fb.1.1781271834219.243522632251564726; _hjSessionUser_171201=eyJpZCI6ImIyNmUxYjAzLTRjZDMtNTY3Ny04MjVlLTgxNWM4NDAyN2Y3YyIsImNyZWF0ZWQiOjE3ODEyNzE4MjQxNjYsImV4aXN0aW5nIjp0cnVlfQ==; cf_clearance=01h00rWwYujB2W5G0_86qctZdeK0POPdRlvcG8LcIqg-1781272023-1.2.1.1-v2T1atFuFvJSDp_kOm4M7hqomivrNSrkbXOYw2qcDeMsKRiZuaIAODN58LOBPd3Ysf_vU40HAuZRsavi7KgrVvCZaYQrv0RXMuKxcwc_Kt5u2nelVp6UqENAdnG9hlh9p3PoVTQR3erGngrcjyPTp0E7LsklBkXQyJ2evEnIF1p0ntwRebNmcUqApW9_tNZGsp4N_2MlnrQf9WMXHzlqYBaSEj3SFroHY93UCeniarLEFWa2tq1eKmiZRmE9oLUThTrFAlNTlzBHecezq5_5SzauhIMyEko4fIECM9YpgCrWy0VhySS6DcZfZr.pvtp3IcVaEyOmys5tTZD3aiUyzw; _ga=GA1.2.2018165888.1781271824; _gid=GA1.2.1432094708.1781271879; OptanonAlertBoxClosed=2026-06-12T13:44:43.615Z; OptanonConsent=isGpcEnabled=0&datestamp=Fri+Jun+12+2026+21%3A44%3A43+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202301.1.0&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1; ab.storage.deviceId.5791d6db-4410-4ace-8814-12c903a548ba=g%3A1cc1fca3-f747-724a-6e20-850bb5275258%7Ce%3Aundefined%7Cc%3A1781271888793%7Cl%3A1781271888793; ab.storage.sessionId.5791d6db-4410-4ace-8814-12c903a548ba=g%3A90b309b3-2c29-84b3-9b4c-424fa008cfb6%7Ce%3A1781273733688%7Cc%3A1781271878794%7Cl%3A1781271933688; _ga_8JE65Q40S6=GS2.1.s1781271824$o1$g1$t1781271934$j59$l0$h0; _sp_id.9ec1=19b252fc-394c-4c99-b624-1c12c8ea5ef4.1781271823.1.1781271968..007d862b-a1f5-4f82-9dcb-c90cc5b6e04e..58cf1006-3ad6-4cd2-b11e-b0a412ceca11.1781271823703.68; _dd_s=rum=0&expire=1781272868264; __cf_bm=KbcaIX6Cl_xvRTp_nvqip.gL5V86wEeBkaSWimMnrBg-1781272146.529346-1.0.1.1-GWO_GdtIk2IUx8mhV_Co9MroE7D3yqEeEtWFyaejQuOvrswuZLF6C3I4oxGv6GP3ITofmsxOzNoJFO7f2t9_E0xO13ycTwHagThf_AVkAvnFOeMQ8dq5rzyIvCMUSi1b; _cfuvid=N0lz3EaVJQGbtNFYzS5sG8Pd56y2aRXokfHOs_D9LdY-1781272146.529346-1.0.1.1-OogLN5qqEIbo2_Tqc3k.ve4vuaYsC3V9sTILgS9fl2A',
        'priority': 'u=1, i',
        'referer': 'https://www.pexels.com/zh-cn/search/muscular%20man/',
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'secret-key': 'H2jk9uKnhRmL6WPwh89zBezWvr',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'x-active-experiment': '',
        'x-client-type': 'react',
        'x-next-forwarded-cf-connecting-ip': '',
        'x-next-forwarded-cf-ipcountry': '',
        'x-next-forwarded-cf-ipregioncode': ''
      }
    })
    // console.log(JSON.stringify(res?.data?.data?.map(t => t?.attributes?.image)));

    return res?.data?.data.map(t => t?.attributes?.image)
  } catch (e) {
    logger.error(`fail to load BM images ${e?.message}`)
    return []
  }
}