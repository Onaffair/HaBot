import { db } from '@utils/db'

/**
 * 资源管理的键值对设置，例如：
 *  - defaultDir: 默认管理目录（目录树初始根目录 / 新资源段快速定位）
 */
class ResourceSettingService {
  /** 读取一个设置项 */
  async get(key: string): Promise<string | null> {
    if (!db.resourceSetting) return null
    const row = await db.resourceSetting.findUnique({ where: { key } })
    return row?.value ?? null
  }

  /** 读取全部设置 */
  async getAll() {
    if (!db.resourceSetting) return []
    return db.resourceSetting.findMany()
  }

  /** 写入（覆盖）一个设置项 */
  async set(key: string, value: string) {
    if (!db.resourceSetting) return null
    return db.resourceSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }

  /** 删除一个设置项 */
  async delete(key: string) {
    if (!db.resourceSetting) return null
    return db.resourceSetting.delete({ where: { key } })
  }
}

export const resourceSettingService = new ResourceSettingService()
export default ResourceSettingService
