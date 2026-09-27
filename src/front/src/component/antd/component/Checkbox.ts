import { defineComponent } from 'vue'
import { Checkbox as AntdCheckbox, CheckboxGroup as AntdCheckboxGroup } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** Checkbox — 单个复选框 (v-model:checked) */
export const Checkbox = defineComponent({
  name: 'Checkbox',
  inheritAttrs: false,
  props: publicPropsOf(AntdCheckbox),
  setup: forwardSetup(AntdCheckbox),
})

/** CheckboxGroup — 复选组; BaseForm 中通过 component='checkboxGroup' 搭配 options */
export const CheckboxGroup = defineComponent({
  name: 'CheckboxGroup',
  inheritAttrs: false,
  props: publicPropsOf(AntdCheckboxGroup),
  setup: forwardSetup(AntdCheckboxGroup),
})

export default Checkbox
