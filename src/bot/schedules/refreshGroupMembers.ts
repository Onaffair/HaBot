import { BeanFactory } from '@/core/bean';
import { Schedule, ScheduleFactory } from "@/core/schedule";
import OneBot from '@/api/common/oneBot';
import { createLogger } from '@utils/logger';
import type { GroupConfig } from '@/beans/group';
import { OB11GroupMember } from '@/interface/onebot';

const factory = BeanFactory.getInstance()
const logger = createLogger('SyncGroupMembers');

const syncGroupMembersSchedule: Schedule = {
  name: '群成员同步',
  description: '定时同步监听群组的成员列表',
  delay: 24 * 60 * 60 * 1000, // 1 D
  handle: async () => {
    const group = factory.getBeanValue<GroupConfig>('group');
    if (!group?.listen?.length) {
      logger.warn('No groups configured for member sync');
      return;
    }
    const reqList: Promise<any>[] = [];
    group.listen.forEach((item) => {
      const res = OneBot.getGroupMemberList({ group_id: item.group_id })
        .then((resp) => {
          const members = resp || [];
          item.members = [...members];
        })
        .catch((err) => {
          logger.error(`Failed to load members for group ${item.group_id}:`, err);
        });
      reqList.push(res);
    });

    await Promise.all(reqList);
    logger.info(`Synced members for ${group.listen.length} groups`);
  },
};

const fac = ScheduleFactory.getInstance();
fac.registry(syncGroupMembersSchedule);

export default syncGroupMembersSchedule;
