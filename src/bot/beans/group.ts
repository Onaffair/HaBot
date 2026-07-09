import { Bean, BeanFactory } from "@/core/bean";
import { OB11GroupMember } from "@/interface/onebot";
import { groupListenService } from "@/services/db";

export interface GroupConfig {
  listen?: Array<{
    group_id: string;
    members: OB11GroupMember[];
  }>;
}
const groupBean: Bean<GroupConfig> = {
  name: 'group',
  value: {
    listen: [],
  },
  init: async () => {
    const groups = await groupListenService.findEnabled();
    const fac = BeanFactory.getInstance();

    fac.setBeanValue('group', {
      listen: groups.map((item) => ({ group_id: item.groupId, members: [] })),
    });
    
  }
};
const factory = BeanFactory.getInstance();
factory.registry(groupBean);