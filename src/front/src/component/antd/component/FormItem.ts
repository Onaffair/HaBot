import { defineComponent } from 'vue'
import { FormItem as AntdFormItem, FormItemRest as AntdFormItemRest } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** FormItem — 单个表单项: 承载 label / name / rules */
export const FormItem = defineComponent({
  name: 'FormItem',
  inheritAttrs: false,
  props: publicPropsOf(AntdFormItem),
  setup: forwardSetup(AntdFormItem),
})

/**
 * FormItemRest — 上下文隔离层
 * 用于「一个 FormItem 内嵌套子 FormItem」的组合控件场景:
 * 外层 FormItem 通过 name+rules 校验主字段;
 * 内层每个子字段包在 <FormItemRest> 里, 防止校验事件冒泡到外层
 */
export const FormItemRest = defineComponent({
  name: 'FormItemRest',
  inheritAttrs: false,
  props: publicPropsOf(AntdFormItemRest),
  setup: forwardSetup(AntdFormItemRest),
})

export default FormItem
