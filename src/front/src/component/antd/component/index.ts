// ============================================================================
// antd 组件封装聚合入口
// - re-export ./Xxx.ts 中的所有透传组件 (PascalCase, 无 A 前缀)
// - 附带导出 ComponentFactory 单例, 供上层按 type 解析组件 (注册动作在 ../index.ts)
// ============================================================================
import Input from './Input'
import Textarea from './Textarea'
import InputNumber from './InputNumber'
import Select from './Select'
import Switch from './Switch'
import DatePicker from './DatePicker'
import TimePicker from './TimePicker'
import Cascader from './Cascader'
import Row from './Row'
import Col from './Col'
import Form from './Form'
import Button from './Button'
import FormItem, { FormItemRest } from './FormItem'
import { Radio, RadioGroup } from './Radio'
import { Checkbox, CheckboxGroup } from './Checkbox'
import { Rate, Slider } from './Rate'

export {
  Input,
  Textarea,
  InputNumber,
  Select,
  Switch,
  Radio,
  RadioGroup,
  Checkbox,
  CheckboxGroup,
  DatePicker,
  TimePicker,
  Cascader,
  Rate,
  Slider,
  Row,
  Col,
  Form,
  FormItem,
  FormItemRest,
  Button,
}

export { ComponentFactory, componentFactory } from '../factory'
export type { RegisteredComponent } from '../factory'
export { extractPublicPropTypes, publicPropsOf, forwardSetup, defineNativeWrapper, pick } from './utils'
