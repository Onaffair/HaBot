import { defineComponent } from 'vue'
import { Textarea as AntdTextarea } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部可覆盖 */
const defaultProps: Record<string, any> = {
  autoSize: { minRows: 2, maxRows: 6 },
}

/** Textarea — antd Textarea 的运行时透传封装 (支持 ref 与默认 props 覆盖) */
export const Textarea = defineComponent({
  name: 'Textarea',
  inheritAttrs: false,
  props: publicPropsOf(AntdTextarea),
  setup: forwardSetup(AntdTextarea, defaultProps),
})

export default Textarea
