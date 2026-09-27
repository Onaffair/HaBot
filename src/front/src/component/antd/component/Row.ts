import { defineComponent } from 'vue'
import { Row as AntdRow } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** 内部默认 props, 外部可覆盖 */
const defaultProps: Record<string, any> = {
  gutter: 12,
}

/** Row — antd 栅格行, 供 BaseForm 二维布局使用 */
export const Row = defineComponent({
  name: 'Row',
  inheritAttrs: false,
  props: publicPropsOf(AntdRow),
  setup: forwardSetup(AntdRow, defaultProps),
})

export default Row
