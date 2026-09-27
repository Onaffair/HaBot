import { defineComponent } from 'vue'
import { Button as AntdButton } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部传入同名字段时会被覆盖 */
const defaultProps: Record<string, any> = {
  type: 'default',
}

/**
 * Button — antd Button 的运行时透传封装
 * - props 派生自 AntdButton 的运行时公开定义 (extractPublicPropTypes)
 * - 支持 ref 绑定: expose 的 Proxy 直接下钻原生实例
 * - 合并顺序: defaultProps < 外部 props < attrs
 */
export const Button = defineComponent({
  name: 'Button',
  inheritAttrs: false,
  props: publicPropsOf(AntdButton),
  setup: forwardSetup(AntdButton, defaultProps),
})

export default Button
