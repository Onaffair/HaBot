import { defineComponent, h, shallowRef } from 'vue'

// ============================================================================
// antd 原生组件二次封装通用工具
// - extractPublicPropTypes: 从 props 定义中过滤掉 `private: true` 的内部字段,
//   得到只包含对外可配置项的运行时 props 声明 (Vue 3.5 未直接导出此工具,
//   行为与 Vue SFC 编译产物内 buildProps 一致)
// - publicPropsOf: 基于 antd 组件对象 .props 派生运行时公开 props
// - forwardSetup: 通用透传 setup
//   * 内部默认 props < 外部传入 props < attrs, 逐层覆盖
//   * 通过 Proxy 将 native 实例作为 ref 视图暴露, 任何方法/属性直接下钻到
//     原生实例, 保证 `<Input ref="x"> x.value.focus()` 等用法与直接使用 antd 一致
// ============================================================================

/**
 * 与 vue 的 buildProps 私有过滤语义一致: 只保留未被 `private: true` 标记的项
 */
export function extractPublicPropTypes(options: Record<string, any>): Record<string, any> {
  const extracted: Record<string, any> = {}
  for (const key of Object.keys(options || {})) {
    const opt = options[key]
    // vue-types 生成的 def 对象同样带 `private` 字段 (antd 部分内部字段会显式标 true)
    if (opt && (opt as any).private !== true) {
      extracted[key] = opt
    }
  }
  return extracted
}

/**
 * 提取 antd 原生组件运行时可见的 props 声明
 * @param native ant-design-vue 导出的组件对象
 */
export function publicPropsOf(native: any): Record<string, any> {
  const raw = native?.props
  // 部分纯渲染子组件 (例如 Space.Addon) 无 props 定义, 兜底为空对象
  if (!raw || typeof raw !== 'object') return {}
  return extractPublicPropTypes(raw)
}

/**
 * 通用透传 setup:
 * - 合并顺序: defaultProps(内部默认) < props(外部声明) < attrs(未声明透传)
 * - shallowRef 承接原生实例, 通过 Proxy expose 让外部 ref 直接触达原生方法
 * @param native 目标 antd 组件
 * @param defaultProps 封装层预设的默认 props, 外部传入同名字段时会被覆盖
 */
export function forwardSetup(native: any, defaultProps: Record<string, any> = {}) {
  return (props: Record<string, any>, ctx: any) => {
    const nativeRef = shallowRef<any>()
    // ref 绑定视图: 通过 Proxy 把 wrapper 实例伪装成 native 实例
    // 保留 getNativeInstance 以便显式拿到内部实例 (例如做类型断言或调试)
    ctx.expose(
      new Proxy({} as Record<string | symbol, any>, {
        get(_target, key) {
          if (key === 'getNativeInstance') return () => nativeRef.value
          return (nativeRef.value as any)?.[key as any]
        },
        has(_target, key) {
          if (key === 'getNativeInstance') return true
          return key in Object(nativeRef.value)
        },
      }),
    )
    // 渲染时按优先级合并: 内部默认 < attrs(未声明透传) < props(外部声明)
    // props 放最后确保已声明的同名字段总能覆盖 attrs 与 defaultProps
    return () =>
      h(native, { ...defaultProps, ...ctx.attrs, ...props, ref: nativeRef }, ctx.slots)
  }
}

/** 备用工厂: 若某组件仅需一行注册可直接调用; 各 Xxx.ts 仍显式使用 defineComponent */
export function defineNativeWrapper(name: string, native: any, defaultProps: Record<string, any> = {}) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: publicPropsOf(native),
    setup: forwardSetup(native, defaultProps),
  })
}

/**
 * 按 key 列表从对象中挑选字段 (BaseForm 用它把 formProps 从自身 props 中拆出来下传给 AForm)
 */
export function pick<T extends Record<string, any>>(source: T, keys: string[]): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of keys) {
    if (source && key in source) result[key] = (source as any)[key]
  }
  return result
}
