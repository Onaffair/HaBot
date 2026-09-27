import { Bean } from "@/core/bean";
import { configService } from '@/services/db/systemConfig';

export const meBean: Bean<string> = {
  name: 'me',
  value: configService.get('ME'),
};
