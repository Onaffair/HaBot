import { defineComponent } from 'vue'
import { Switch as AntdSwitch } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部可覆盖 */
const defaultProps: Record<string, any> = {
  checkedChildren: '开',
  unCheckedChildren: '关',
}

/** Switch — antd Switch 的运行时透传封装 */
export const Switch = defineComponent({
  name: 'Switch',
  inheritAttrs: false,
  props: publicPropsOf(AntdSwitch),
  setup: forwardSetup(AntdSwitch, defaultProps),
})

export default Switch
