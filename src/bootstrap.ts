import 'dotenv/config';
import { createLogger } from '@/utils/logger';
import DatabaseService from '@/utils/db';
import App from '@/core/app';
import { BeanFactory } from '@/core/bean';
const logger = createLogger('Bootstrap');




/**
 * Bot系统启动
 * 1、数据库连接初始化
 * 2、从env或数据库中加载bean并注入到beanFactory
 * 3、APP实例初始化,工厂实例化
 * 4、系统过滤器，命令，定时任务注册
 */
async function bootstrap() {
  /**db init */
  DatabaseService.getInstance()

  /**load Bean */
  await import('@/beans')
  await BeanFactory.getInstance().initAllBean()
  
  /**app start */
  const app = App.getInstance()
  app.start()

  /**factory register */
  await Promise.all([
    import('@/adapter'),
    import('@/commands'),
    import('@/filters'),
    import('@/schedules')
  ])
}

bootstrap().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
