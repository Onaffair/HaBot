import { defineComponent } from 'vue'
import { InputNumber as AntdInputNumber } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部可覆盖 */
const defaultProps: Record<string, any> = {
  controls: true,
}

/** InputNumber — antd InputNumber 的运行时透传封装 */
export const InputNumber = defineComponent({
  name: 'InputNumber',
  inheritAttrs: false,
  props: publicPropsOf(AntdInputNumber),
  setup: forwardSetup(AntdInputNumber, defaultProps),
})

export default InputNumber
