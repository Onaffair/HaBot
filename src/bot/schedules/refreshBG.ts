import { BeanFactory } from '@/core/bean';
import { Schedule, ScheduleFactory } from "@/core/schedule";
import { getBGImage, getBMImage } from '@/api/common/online';
import { createLogger } from '@utils/logger';

const factory = BeanFactory.getInstance()
const logger = createLogger('RefreshBG');

const refreshBGSchedule: Schedule = {
  name: '背景图刷新',
  description: '定时刷新背景图片资源池',
  delay: 24 * 60 * 60 * 1000, // 6 小时
  handle: async () => {
    logger.info('Starting BG image refresh...');
    try {
      const bgUrlArr = await getBGImage()

      const BG = bgUrlArr
      const fac = BeanFactory.getInstance()
      fac.setBeanValue('BG', BG)
      logger.info(`Loaded ${BG.length} BG images`);
    } catch (error) {
      logger.error('Error refreshing BG images:', error);
    }
  },
};
// const fac = ScheduleFactory.getInstance();
// fac.registry(refreshBGSchedule);

export default refreshBGSchedule;
