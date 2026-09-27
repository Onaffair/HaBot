// ============================================================================
// 组件工厂 (懒汉单例)
// - 以字符串 type 为键, 将二次封装好的 antd 组件实例注册进内部集合
// - BaseForm 通过 resolve(type) 拿到实际渲染组件; 也可直接传入组件对象
// - 可注册的 type 由 ../types 的 RegisterPropsMap 白名单约束, 表外键编译期报错
// ============================================================================
import type { RegisterPropsMap, RegisterType } from './types'

/** 注册项描述: 保留来源信息便于按 source 清理, 与项目其他工厂保持一致 */
export interface RegisteredComponent<K extends string = RegisterType> {
  type: K
  component: any
  /** 注册来源 (base / 业务模块名), 便于按 source 批量移除 */
  source?: string
}

class ComponentFactory<Map extends Record<string, any> = RegisterPropsMap> {
  /** 单例实例 */
  private static instance: ComponentFactory
  /** type → 注册项 */
  private registry = new Map<keyof Map, RegisteredComponent<keyof Map & string>>()

  /** 私有构造: 单例语义, 禁止外部 new */
  private constructor() {}

  /** 获取全局唯一实例 */
  static getInstance(): ComponentFactory {
    if (!ComponentFactory.instance) {
      ComponentFactory.instance = new ComponentFactory()
    }
    return ComponentFactory.instance
  }

  /**
   * 注册组件; 相同 type 二次注册按幂等覆盖
   * @param type 字段类型标识, 仅允许 RegisterType (RegisterPropsMap 的键)
   * @param component 已封装好的组件对象 (或原生 antd 组件)
   * @param source 注册来源标识, 便于按来源清理
   */
  register<K extends keyof Map & RegisterType>(type: K, component: any, source = 'base'): this {
    this.registry.set(type, { type, component, source })
    return this
  }

  /** 按 type 注销单个注册项 */
  unregister(type: keyof Map & RegisterType): boolean {
    return this.registry.delete(type)
  }

  /** 按来源批量注销 */
  unregisterBySource(source: string): number {
    let count = 0
    for (const [key, item] of this.registry) {
      if (item.source === source) {
        this.registry.delete(key)
        count++
      }
    }
    return count
  }

  /** 是否已注册 */
  has(type: keyof Map & RegisterType): boolean {
    return this.registry.has(type)
  }

  /** 列出当前所有 type 标识 */
  listTypes(): (keyof Map & RegisterType)[] {
    return Array.from(this.registry.keys()) as (keyof Map & RegisterType)[]
  }

  /**
   * 解析组件: 字符串按注册表查找, 未命中告警并返回 null;
   * 非字符串 (组件对象/函数式组件) 直接原样返回
   */
  resolve(target: (keyof Map & RegisterType) | any): any {
    if (!target) return null
    if (typeof target !== 'string') return target
    const hit = this.registry.get(target as keyof Map & RegisterType)
    if (!hit) {
      console.warn(`[ComponentFactory] unregistered type: ${target}`)
      return null
    }
    return hit.component
  }
}

/** 模块级单例引用, 供外部直接 import 使用 */
export const componentFactory = ComponentFactory.getInstance()

export { ComponentFactory }
