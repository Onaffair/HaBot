import { Schedule } from '@/core/schedule';
import { createLogger } from '@utils/logger';
import OneBot from '@/api/common/oneBot';
import { PlaywrightManager } from '@/utils/playwright';

const logger = createLogger('YysDyjcShot');

/** 对弈竞猜页面地址 */
const DYJC_PAGE_URL = 'https://yysrank.com/dyjc.html';
/** 推送目标群 */
const TARGET_GROUP_ID = '693384220';
/** 生效起始小时（含），到当日 23:59:59 结束 */
const ACTIVE_START_HOUR = 10;

export const yysRankSchedule: Schedule = {
  name: '对弈竞猜页面截图推送',
  description: '每 20 分钟截图 yysrank 对弈竞猜页面并推送到指定群（仅每日 10:00~23:59:59 生效）',
  delay: 20 * 60 * 1000,
  handle: async () => {
    // 只在每日 10:00:00 ~ 23:59:59 区间执行，其余时段直接跳过
    const hour = new Date().getHours();
    if (hour < ACTIVE_START_HOUR) {
      logger.info(`Skip dyjc shot: out of active window (now ${hour}:00, need >= ${ACTIVE_START_HOUR}:00)`);
      return;
    }
    try {
      const buffer = await PlaywrightManager.getInstance().screenshot(DYJC_PAGE_URL);
      // sendGroupMsg 的 message 需为消息段数组（与 session.sendItems 一致），
      // 不能直接传 MessageBuilder.build() 产出的 ActionResult 对象
      const message = [
        { type: 'image', data: { file: `base64://${buffer.toString('base64')}` } },
        { type: 'text', data: { text: '耄耋每20min更新一次' } },
      ];
      await OneBot.sendGroupMsg({ group_id: TARGET_GROUP_ID, message });
      logger.info(`Dyjc page screenshot sent to group ${TARGET_GROUP_ID} (${buffer.length} bytes)`);
    } catch (err) {
      logger.error('Failed to screenshot/send dyjc page:', err);
    }
  },
};
