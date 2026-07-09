import { Bean, BeanFactory } from "@/core/bean";
import { resourceCategoryService } from "@/services/db";

export interface ResourceConfig {
  path?: string;
  folder?: Array<{
    name: string;
    path: string;
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
    const categories = await resourceCategoryService.findAll()
    const fac = BeanFactory.getInstance()

    fac.setBeanValue('resource', {
      path: process.env.RESOURCE_PATH,
      folder: categories.map((item) => ({
        name: item.name,
        path: item.path,
        children: [],
      })),
    })
  }
};

const factory = BeanFactory.getInstance();
factory.registry(resourceBean);