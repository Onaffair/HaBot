import { defineComponent } from 'vue'
import { Rate as AntdRate, Slider as AntdSlider } from 'ant-design-vue'
import { publicPropsOf, forwardSetup } from './utils'

/** Rate — 评分 */
const rateDefaults: Record<string, any> = {
  count: 5,
  allowHalf: true,
}
export const Rate = defineComponent({
  name: 'Rate',
  inheritAttrs: false,
  props: publicPropsOf(AntdRate),
  setup: forwardSetup(AntdRate, rateDefaults),
})

/** Slider — 滑动输入 */
export const Slider = defineComponent({
  name: 'Slider',
  inheritAttrs: false,
  props: publicPropsOf(AntdSlider),
  setup: forwardSetup(AntdSlider),
})

export default Rate
