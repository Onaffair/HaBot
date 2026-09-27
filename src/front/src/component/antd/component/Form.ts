import { defineComponent } from 'vue'
import { Form as AntdForm } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/**
 * Form — antd Form 的运行时透传封装
 * 通过 Proxy expose 支持 ref 绑定:
 *   <Form ref="x" /> → x.value.validate() / x.value.resetFields() / x.value.clearValidate()
 * 与直接使用 antd Form 行为一致
 */
export const Form = defineComponent({
  name: 'Form',
  inheritAttrs: false,
  props: publicPropsOf(AntdForm),
  setup: forwardSetup(AntdForm),
})

export default Form
