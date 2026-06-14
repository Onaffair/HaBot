import { Bean, BeanFactory } from "@/core/bean";

export interface OssConfig {
  region?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  bucket?: string;
}
export const ossBean: Bean<OssConfig> = {
  name: 'oss',
  value: {
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
  },
};

const fac = BeanFactory.getInstance();
fac.registry(ossBean);
