import axios from 'axios';
import { createLogger } from '@utils/logger';

const logger = createLogger('BGImage');

interface ImageReqParams {
  pid: string;
  pidli: string;
  pmod: string;
}

/** 获取百度图库的背景图片 */
export async function getBGImage(params: ImageReqParams) {
  try {
    const res = await axios.post(
      'https://alaan.top/ajax.php',
      new URLSearchParams({ ...params }),
      { timeout: 30000 },
    );
    return res.data;
  } catch (e: any) {
    logger.error('Failed to fetch BG image:', e?.message);
    return null;
  }
}
