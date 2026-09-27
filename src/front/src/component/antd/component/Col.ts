import { defineComponent } from 'vue'
import { Col as AntdCol } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** Col — antd 栅格列, 供 BaseForm 二维布局使用 */
export const Col = defineComponent({
  name: 'Col',
  inheritAttrs: false,
  props: publicPropsOf(AntdCol),
  setup: forwardSetup(AntdCol),
})

export default Col
