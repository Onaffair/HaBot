import { Bean, BeanFactory } from "@/core/bean";
import { OB11GroupMember } from "@/interface/onebot";
import DatabaseService from "@/utils/db";

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
    const db = DatabaseService.getInstance()
    if (!db.groupListen) return;
    const groups = await db.groupListen.findMany({
      where: { enabled: true },
    });
    const fac = BeanFactory.getInstance();

    fac.setBeanValue('group', {
      listen: groups.map((item) => ({ group_id: item.groupId, members: [] })),
    });
    
  }
};
const factory = BeanFactory.getInstance();
factory.registry(groupBean);
