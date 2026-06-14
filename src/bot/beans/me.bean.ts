import { Bean, BeanFactory } from "@/core/bean";

export const meBean: Bean<string> = {
  name: 'me',
  value: process.env.ME,
};

const fac = BeanFactory.getInstance();
fac.registry(meBean);
