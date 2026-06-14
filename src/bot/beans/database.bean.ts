import { Bean, BeanFactory } from "@/core/bean";

export interface DatabaseConfig {
  url?: string;
}

export const databaseBean: Bean<DatabaseConfig> = {
  name: 'database',
  value: {
    url: process.env.DATABASE_URL,
  },
};

const fac = BeanFactory.getInstance();
fac.registry(databaseBean);
