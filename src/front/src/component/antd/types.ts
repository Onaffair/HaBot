// ============================================================================
// BaseForm 类型定义
// ----------------------------------------------------------------------------
// 所有类型都基于 ant-design-vue 内部定义的 props 派生:
// - FormItem    extends FormItemProps      (等价 ExtractPublicPropTypes<typeof formItemProps>)
// - FormRow     extends RowProps
// - FormCol     extends ColProps
// - BaseFormProps extends FormProps
// 每个字段的 props 通过 ExtractPublicProps<C> 从组件对象的类型定义派生 (运行时对应
// publicPropsOf = extractPublicPropTypes), 与 antd 原生公开 props 完全同源。
//
// 字段类型: FormField 是 InputField / SelectField / ... 的可辨识联合, 通过
// `type` 字段区分组件, 每个变体的 `props` 精确对应目标 antd 组件的公开 props。
// ============================================================================
import type {
  AllowedComponentProps,
  Component,
  ExtractPublicPropTypes,
  Slot,
  VNode,
  VNodeProps,
} from 'vue'
import type {
  CheckboxGroupProps,
  CheckboxProps,
  ColProps,
  DatePickerProps,
  FormItemProps,
  FormProps,
  InputNumberProps,
  InputProps,
  RadioGroupProps,
  RadioProps,
  RateProps,
  RowProps,
  SelectProps,
  SliderProps,
  SwitchProps,
  TextAreaProps,
  TimePickerProps,
} from 'ant-design-vue'
import type { CascaderProps } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
// 组件运行时值导入: 供 ExtractPublicProps<typeof AntdXxx> 派生类型使用
import type {
  Cascader as AntdCascader,
  Checkbox as AntdCheckbox,
  CheckboxGroup as AntdCheckboxGroup,
  DatePicker as AntdDatePicker,
  Input as AntdInput,
  InputNumber as AntdInputNumber,
  Radio as AntdRadio,
  RadioGroup as AntdRadioGroup,
  Rate as AntdRate,
  Select as AntdSelect,
  Slider as AntdSlider,
  Switch as AntdSwitch,
  Textarea as AntdTextarea,
  TimePicker as AntdTimePicker,
} from 'ant-design-vue'


export type InputField = {
  type: 'input',
  props: ExtractPublicPropTypes<InputProps>
}

export type TextareaField = {
  type: 'textarea',
  props: ExtractPublicPropTypes<TextAreaProps>
}

export type InputNumberField = {
  type: 'inputNumber',
  props: ExtractPublicPropTypes<InputNumberProps>
}

export type SelectField = {
  type: 'select',
  props: ExtractPublicPropTypes<SelectProps>
}

export type SwitchField = {
  type: 'switch',
  props: ExtractPublicPropTypes<SwitchProps>
}

export type RadioField = {
  type: 'radio',
  props: ExtractPublicPropTypes<RadioProps>
}

export type RadioGroupField = {
  type: 'radioGroup',
  props: ExtractPublicPropTypes<RadioGroupProps>
}

export type CheckboxField = {
  type: 'checkbox',
  props: ExtractPublicPropTypes<CheckboxProps>
}

export type CheckboxGroupField = {
  type: 'checkboxGroup',
  props: ExtractPublicPropTypes<CheckboxGroupProps>
}

export type DatePickerField = {
  type: 'datePicker',
  props: ExtractPublicPropTypes<DatePickerProps>
}

export type TimePickerField = {
  type: 'timePicker',
  props: ExtractPublicPropTypes<TimePickerProps>
}

export type CascaderField = {
  type: 'cascader',
  props: ExtractPublicPropTypes<CascaderProps>
}

export type RateField = {
  type: 'rate',
  props: ExtractPublicPropTypes<RateProps>
}

export type SliderField = {
  type: 'slider',
  props: ExtractPublicPropTypes<SliderProps>
}

export type SlotField = {
  slots?: {
    [key: string]: Slot
  }
}

/** 字段取值绑定路径: 字符串 (model 键) 或数组 (嵌套路径) */
export type FormPath = string | (string | number)[]

/** 渲染层绑定元信息: name 决定取值键, item 透传给 a-form-item (label / rules 等) */
export type ItemField = {
  name?: FormPath
  item?: ExtractPublicPropTypes<FormItemProps>
}

export type SingleField =
  (
    | InputField
    | TextareaField
    | InputNumberField
    | SelectField
    | SwitchField
    | RadioField
    | RadioGroupField
    | CheckboxField
    | CheckboxGroupField
    | DatePickerField
    | TimePickerField
    | CascaderField
    | RateField
    | SliderField
  ) & SlotField & ItemField

export type GroupField = ItemField & {
  type: 'group',
  children: SingleField[]
}

/**
 * 自定义控件字段: 无法用 antd 基本组件表达的复杂输入 (如消息段列表编辑器),
 * 直接传入一个组件实例渲染; 值仍由外层 FormItem(name) 绑定注入。
 * 若该控件用 v-model(modelValue) 而非 value, 在 item 里设 valuePropName: 'modelValue'。
 */
export type CustomField = ItemField & {
  type: 'custom'
  /** 自定义控件组件 (Vue 组件对象) */
  component: Component
  /** 透传给该组件的静态 props */
  props?: Record<string, unknown>
  slots?: {
    [key: string]: Slot
  }
}

export type SchemaField = SingleField | GroupField | CustomField

export type SchemaNode =
  | SchemaField
  | RowField
  | ColField
export type RowField = {
  type: 'row',
  props: ExtractPublicPropTypes<RowProps>
  children: SchemaNode[]
}
export type ColField = {
  type: 'col',
  props: ExtractPublicPropTypes<ColProps>,
  children: SchemaNode[]
}
export type LayoutField = RowField | ColField
export type InputType = SchemaField['type']
/** 单字段 (antd 基本控件) type 键集合, 与组件工厂注册白名单同源 */
export type SingleFieldType = SingleField['type']

export type FormSchema = {
  form: ExtractPublicPropTypes<FormProps>
  fields: LayoutField[] | SchemaField[]
}

// ============================================================================
// 组件工厂注册白名单
// ----------------------------------------------------------------------------
// componentFactory 只接受此表中的 type 键, 值为其对应的公开 props 类型:
// - 单字段: 从 SchemaField 各可辨识变体取 props
// - 布局:   row / col 对应 RowProps / ColProps 派生类型
// ============================================================================
export type RegisterPropsMap = {
  input: InputField['props']
  textarea: TextareaField['props']
  inputNumber: InputNumberField['props']
  select: SelectField['props']
  switch: SwitchField['props']
  radio: RadioField['props']
  radioGroup: RadioGroupField['props']
  checkbox: CheckboxField['props']
  checkboxGroup: CheckboxGroupField['props']
  datePicker: DatePickerField['props']
  timePicker: TimePickerField['props']
  cascader: CascaderField['props']
  rate: RateField['props']
  slider: SliderField['props']
  row: ExtractPublicPropTypes<RowProps>
  col: ExtractPublicPropTypes<ColProps>
}

/** 允许注册的组件 type, 与 schema 节点的 type 同源 */
export type RegisterType = keyof RegisterPropsMap








