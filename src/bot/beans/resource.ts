import { Bean, BeanFactory } from "@/core/bean";
import { managedResourceService } from "@/services/db";

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

const resourceBean: Bean<ResourceConfig> = {
  name: 'resource',
  value: {
    path: process.env.RESOURCE_PATH || '@/src/resource',
    folder: [],
  },
  init: async () => {
    const resources = await managedResourceService.findEnabled()
    const fac = BeanFactory.getInstance()

    fac.setBeanValue('resource', {
      path: process.env.RESOURCE_PATH,
      folder: resources.map((item) => ({
        name: item.name,
        path: item.path,
        keywords: item.keywords,
        enabled: true,
        children: [],
      })),
    })
  }
};

const factory = BeanFactory.getInstance();
factory.registry(resourceBean);
