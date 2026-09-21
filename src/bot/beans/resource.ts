import { Bean, BeanFactory } from "@/core/bean";
import { runtime } from "@/core/runtime";

export interface ResourceConfig {
  path?: string;
  folder?: Array<{
    name: string;
    path: string;
    keywords?: string[];
    enabled?: boolean;
    children: Array<any>
  }>;
}

export const resourceBean: Bean<ResourceConfig> = {
  name: 'resource',
  value: {
    path: process.env.RESOURCE_PATH || '@/src/resource',
    folder: [],
  },
  init: async () => {
    // 以数据库 managed_resources 为准初始化 resource bean（folder 项 + children 由
    // 定时刷新扫描填充），同时注册各已启用资源段的动态命令。
    // 统一收敛到 core/runtime：启动加载与后端直调共用同一套逻辑。
    await runtime.applyResources()
    const fac = BeanFactory.getInstance()
    const current = fac.getBeanValue<ResourceConfig>('resource')
    if (current) {
      fac.setBeanValue('resource', {
        ...current,
        path: process.env.RESOURCE_PATH,
      })
    }
  }
};
