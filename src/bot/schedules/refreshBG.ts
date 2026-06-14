import { BeanFactory } from '@/core/bean';
import { Schedule, ScheduleFactory } from "@/core/schedule";
import { getBGImage, getBMImage } from '@/api/common';
import { createLogger } from '@utils/logger';

const factory = BeanFactory.getInstance()
const logger = createLogger('RefreshBG');

const refreshBGSchedule: Schedule = {
  name: '背景图刷新',
  description: '定时刷新背景图片资源池',
  delay: 6 * 60 * 60 * 1000, // 6 小时
  handle: async () => {
    logger.info('Starting BG image refresh...');
    try {
      const reqList: Promise<any>[] = [];


      for (let i = 0; i <= 10; i++) {
        for (let j = 1; j < 2; j++) {
          reqList.push(getBGImage({ pid: i.toString(), pidli: j.toString(), pmod: 'ptl' }));
        }
      }
      
      // reqList.push(getBMImage({ page: '1', number: '100', query: 'muscle man' }))

      const BG = (await Promise.all(reqList))
        .flat()
        //过滤不要的图片
        .filter(t => ![
          'https://gss0.baidu.com/94o3dSag_xI4khGko9WTAnF6hhy/lbsugc/pic/item/0df3d7ca7bcb0a46bf380fee2e63f6246a60afcb.jpg',
        ].includes(t))
      factory.setBeanValue('BG', BG);

      logger.info(`Loaded ${BG.length} BG images`);
    } catch (error) {
      logger.error('Error refreshing BG images:', error);
    }
  },
};
const fac = ScheduleFactory.getInstance();
fac.registry(refreshBGSchedule);

export default refreshBGSchedule;
