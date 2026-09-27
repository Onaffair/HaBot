// ============================================================================
// 节点工厂 (懒汉单例)
// ----------------------------------------------------------------------------
// - 以节点类别 (NodeKind) 为键, 将 NodeDefinition (组件 + 表单 + 默认数据 + 端口) 注册进内部集合
// - 画布通过 resolve(type) 拿到节点组件, 通过 getFormSchema(type) 拿到配置表单
// - 各节点在定义文件末尾调用 nodeRegistry.register(...) 完成自注册 (见 nodes/index.ts)
// ============================================================================
import type { NodeDefinition, NodeKind } from './types'

class NodeFactory {
  /** 单例实例 */
  private static instance: NodeFactory
  /** type → 节点定义 */
  private registry = new Map<NodeKind, NodeDefinition>()

  /** 私有构造: 单例语义, 禁止外部 new */
  private constructor() {}

  /** 获取全局唯一实例 */
  static getInstance(): NodeFactory {
    if (!NodeFactory.instance) {
      NodeFactory.instance = new NodeFactory()
    }
    return NodeFactory.instance
  }

  /** 注册节点定义; 相同 type 二次注册按幂等覆盖 */
  register(def: NodeDefinition): this {
    this.registry.set(def.type, def)
    return this
  }

  /** 按 type 注销单个注册项 */
  unregister(type: NodeKind): boolean {
    return this.registry.delete(type)
  }

  /** 是否已注册 */
  has(type: NodeKind): boolean {
    return this.registry.has(type)
  }

  /** 取回全部节点定义 (工具栏渲染顺序即注册顺序) */
  list(): NodeDefinition[] {
    return Array.from(this.registry.values())
  }

  /** 按 type 取回节点定义, 未命中告警并返回 null */
  resolve(type: NodeKind): NodeDefinition | null {
    const hit = this.registry.get(type)
    if (!hit) {
      console.warn(`[NodeFactory] unregistered node type: ${type}`)
      return null
    }
    return hit
  }

  /** 按 type 取回配置表单 schema */
  getFormSchema(type: NodeKind) {
    return this.resolve(type)?.formSchema
  }

  /** 按 type 构造一份新节点的默认数据 */
  createData(type: NodeKind) {
    return this.resolve(type)?.createData()
  }
}

/** 模块级单例引用, 供外部直接 import 使用 */
export const nodeRegistry = NodeFactory.getInstance()

export { NodeFactory }
