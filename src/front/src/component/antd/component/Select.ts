import { defineComponent } from 'vue'
import { Select as AntdSelect } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部可覆盖 */
const defaultProps: Record<string, any> = {
  allowClear: true,
  style: { width: '100%' },
}

/** Select — antd Select 的运行时透传封装 */
export const Select = defineComponent({
  name: 'Select',
  inheritAttrs: false,
  props: publicPropsOf(AntdSelect),
  setup: forwardSetup(AntdSelect, defaultProps),
})

export default Select
