import { db } from '@utils/db'

export interface CreateCategoryInput {
  name: string
  path: string
  description?: string
}

export interface UpdateCategoryInput {
  name?: string
  path?: string
  description?: string
}

class ResourceCategoryService {
  /** 获取所有分类 */
  async findAll() {
    if (!db.resourceCategory) return []
    return db.resourceCategory.findMany()
  }

  /** 根据 ID 查找 */
  async findById(id: number) {
    if (!db.resourceCategory) return null
    return db.resourceCategory.findUnique({ where: { id } })
  }

  /** 根据名称查找 */
  async findByName(name: string) {
    if (!db.resourceCategory) return null
    return db.resourceCategory.findUnique({ where: { name } })
  }

  /** 创建分类 */
  async create(data: CreateCategoryInput) {
    if (!db.resourceCategory) return null
    return db.resourceCategory.create({ data })
  }

  /** 更新分类 */
  async update(id: number, data: UpdateCategoryInput) {
    if (!db.resourceCategory) return null
    return db.resourceCategory.update({ where: { id }, data })
  }

  /** 删除分类 */
  async delete(id: number) {
    if (!db.resourceCategory) return null
    return db.resourceCategory.delete({ where: { id } })
  }
}

export const resourceCategoryService = new ResourceCategoryService()
export default ResourceCategoryService