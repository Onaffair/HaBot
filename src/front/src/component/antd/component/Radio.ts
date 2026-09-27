import { defineComponent } from 'vue'
import { Radio as AntdRadio, RadioGroup as AntdRadioGroup } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** Radio — 单选按钮 (单个) */
export const Radio = defineComponent({
  name: 'Radio',
  inheritAttrs: false,
  props: publicPropsOf(AntdRadio),
  setup: forwardSetup(AntdRadio),
})

/** RadioGroup — 单选组; BaseForm 中通过 component='radioGroup' 搭配 options 使用 */
const groupDefaults: Record<string, any> = {
  optionType: 'default',
}
export const RadioGroup = defineComponent({
  name: 'RadioGroup',
  inheritAttrs: false,
  props: publicPropsOf(AntdRadioGroup),
  setup: forwardSetup(AntdRadioGroup, groupDefaults),
})

export default Radio
