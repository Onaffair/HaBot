import { defineComponent } from 'vue'
import { DatePicker as AntdDatePicker } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部可覆盖 */
const defaultProps: Record<string, any> = {
  style: { width: '100%' },
}

/** DatePicker — antd DatePicker 的运行时透传封装 (RangePicker 通过 props.picker 使用) */
export const DatePicker = defineComponent({
  name: 'DatePicker',
  inheritAttrs: false,
  props: publicPropsOf(AntdDatePicker),
  setup: forwardSetup(AntdDatePicker, defaultProps),
})

export default DatePicker
