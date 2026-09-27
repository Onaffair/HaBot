import { defineComponent } from 'vue'
import { TimePicker as AntdTimePicker } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部可覆盖 */
const defaultProps: Record<string, any> = {
  style: { width: '100%' },
}

/** TimePicker — antd TimePicker 的运行时透传封装 */
export const TimePicker = defineComponent({
  name: 'TimePicker',
  inheritAttrs: false,
  props: publicPropsOf(AntdTimePicker),
  setup: forwardSetup(AntdTimePicker, defaultProps),
})

export default TimePicker
