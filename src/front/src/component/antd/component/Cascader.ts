import { defineComponent } from 'vue'
import { Cascader as AntdCascader } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部可覆盖 */
const defaultProps: Record<string, any> = {
  style: { width: '100%' },
  expandTrigger: 'hover',
}

/** Cascader — antd Cascader 的运行时透传封装 */
export const Cascader = defineComponent({
  name: 'Cascader',
  inheritAttrs: false,
  props: publicPropsOf(AntdCascader),
  setup: forwardSetup(AntdCascader, defaultProps),
})

export default Cascader
