import { Bean, BeanFactory } from "@/core/bean";

export const bgBean: Bean<string[]> = {
  name: 'BG',
  value: [],
};
const fac = BeanFactory.getInstance();
fac.registry(bgBean);
