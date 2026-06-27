import { Bean, BeanFactory } from '@/core/bean';

export interface AIChatConfig {
  enabled: boolean;
  recentCount: number;      // 短期上下文保留条数
}

export const aiChatBean: Bean<AIChatConfig> = {
  name: 'aiChat',
  value: {
    enabled: true,
    recentCount: 20,
  },
};

BeanFactory.getInstance().registry(aiChatBean);
