import { defineComponent } from 'vue'
import { Input as AntdInput } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部传入同名字段时会被覆盖 */
const defaultProps: Record<string, any> = {
  allowClear: true,
}

/**
 * Input — antd Input 的运行时透传封装
 * - props 从 AntdInput 的运行时定义派生 (extractPublicPropTypes), 与原生一致
 * - 支持 ref 绑定: expose 的 Proxy 直接下钻到原生实例 (focus/blur/select 等)
 * - 默认值链: defaultProps < 外部 props < attrs
 */
export const Input = defineComponent({
  name: 'Input',
  inheritAttrs: false,
  props: publicPropsOf(AntdInput),
  setup: forwardSetup(AntdInput, defaultProps),
})

export default Input
