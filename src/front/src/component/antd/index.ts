// ============================================================================
// antd 组件目录对外入口
// - 引入组件工厂 (ComponentFactory 单例) 并将各封装好的 antd 组件按 type 注册
// - 聚合导出所有透传封装 (Input / Select / Row / ...) 与 BaseForm 主表单
// - 可注册的 type 受 types.ts 的 RegisterPropsMap 白名单约束 (register 编译期检查),
//   业务侧新增字段类型需先在白名单中登记
// ============================================================================
import BaseForm from './BaseForm.vue'
import {
  Button,
  Cascader,
  Checkbox,
  CheckboxGroup,
  Col,
  DatePicker,
  Form,
  FormItem,
  FormItemRest,
  Input,
  InputNumber,
  Rate,
  Radio,
  RadioGroup,
  Row,
  Select,
  Slider,
  Switch,
  Textarea,
  TimePicker,
  componentFactory,
} from './component'

// ----------------------------------------------------------------------------
// 组件工厂注册: 以字符串 type 为键, 将二次封装组件实例注册到工厂
// - type 取值只能是 RegisterType (types.ts 白名单的键), 与 schema 节点 type 同源
// - BaseForm 通过 componentFactory.resolve('input') 拿到实际渲染组件
// ----------------------------------------------------------------------------
componentFactory
  .register('input', Input)
  .register('textarea', Textarea)
  .register('inputNumber', InputNumber)
  .register('select', Select)
  .register('switch', Switch)
  .register('radio', Radio)
  .register('radioGroup', RadioGroup)
  .register('checkbox', Checkbox)
  .register('checkboxGroup', CheckboxGroup)
  .register('datePicker', DatePicker)
  .register('timePicker', TimePicker)
  .register('cascader', Cascader)
  .register('rate', Rate)
  .register('slider', Slider)
  .register('row', Row)
  .register('col', Col)

export { BaseForm }
export default BaseForm

// 类型与工具再导出
export * from './component'
export type {
  CascaderField,
  CheckboxField,
  CheckboxGroupField,
  ColField,
  CustomField,
  DatePickerField,
  FormPath,
  FormSchema,
  GroupField,
  InputField,
  InputNumberField,
  InputType,
  ItemField,
  LayoutField,
  RateField,
  RadioField,
  RadioGroupField,
  RegisterPropsMap,
  RegisterType,
  RowField,
  SchemaField,
  SchemaNode,
  SelectField,
  SingleField,
  SingleFieldType,
  SliderField,
  SlotField,
  SwitchField,
  TextareaField,
  TimePickerField,
} from './types'
export { deepClone, deepMerge, getByPath, joinPath, setByPath, toPathArr } from './utils/path'
