import { Bean } from "@/core/bean";
import { OB11GroupMember } from "@/interface/onebot";
import { runtime } from "@/core/runtime";

export interface GroupConfig {
  listen?: Array<{
    group_id: string;
    members: OB11GroupMember[];
  }>;
}
export const groupBean: Bean<GroupConfig> = {
  name: 'group',
  value: {
    listen: [],
  },
  init: async () => {
    // 以 group_listens 初始化监听群；运行期由后端直调 core/runtime 统一刷新
    await runtime.refreshGroups();
  }
};