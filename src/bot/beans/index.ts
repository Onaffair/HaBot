import { BeanFactory } from '@/core/bean'
import type { Bean } from '@/core/bean'

import { aiChatBean } from './aiChat'
import { groupBean } from './group'
import { meBean } from './me'
import { resourceBean } from './resource'

/**
 * Bean 显式注册表：新增配置项先在实现文件导出 Bean 定义，再在此列表登记。
 * 注册后由入口统一执行 initAllBean() 完成按库初始化（取代原目录自动扫描机制）。
 */
const beans: Bean[] = [
  meBean,
  aiChatBean,
  resourceBean,
  groupBean,
]

const factory = BeanFactory.getInstance()
beans.forEach(bean => factory.registry(bean))
