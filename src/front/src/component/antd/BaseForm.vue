<script setup lang="tsx">
// ============================================================================
// BaseForm — 基于 Schema 的动态表单组件
// ----------------------------------------------------------------------------
// 设计要点:
// 1. Row / Col / Group 全部经由 renderNode 按 node.type 分发递归:
//    row.children 可再嵌 col/row, 深度不限, 因此用一套递归替代重复模板。
// 2. FormItem 是渲染层自动产物: 用户 schema 只声明字段本身, 不需要写 formItem 节点;
//    label / rules 等通过可选的 `item` 透传给 a-form-item。
// 3. GroupField = "一个 Form.Item 内并排渲染多个控件" (如 姓+名), 所以 renderGroup
//    直接对 children 调 renderComponent, 组内不再出现 Group / Row / Col。
// 4. Schema 的 props 只是静态配置: 运行时 value 由本组件按 name 显式绑定到 model。
//    antd-vue v4 的 FormItem(name) 只负责校验与 id, 不会向插槽控件注入 value/onUpdate,
//    因此渲染时手动生成 onUpdate:<prop> 写回 model, 初值播种后 Schema 不再被改写。
// ============================================================================
import { ref, reactive, watch, h } from 'vue'
import type { Component, VNode } from 'vue'
import { Col as ACol, Row as ARow } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import type {
  ColField,
  CustomField,
  FormPath,
  FormSchema,
  GroupField,
  RowField,
  SchemaNode,
  SingleField,
  SingleFieldType,
} from './types'
// Form / FormItem 为渲染层骨架 (未注册进工厂), 直接引入封装组件;
// 字段控件则统一从工厂按 type 解析获取 (注册动作在 ./index.ts)
import { Form, FormItem, componentFactory } from './component'

// ----------------------------------------------------------------------------
// 组件映射表: 单字段 type -> 工厂中注册的 antd 控件
// 用懒函数包裹 resolve: index.ts 先 import 本组件、后执行 register,
// 若在模块初始化时立即 resolve 会拿到 null, 延迟到渲染时解析才正确。
// ----------------------------------------------------------------------------
const componentMap: Record<SingleFieldType, () => Component> = {
  input: () => componentFactory.resolve('input'),
  textarea: () => componentFactory.resolve('textarea'),
  inputNumber: () => componentFactory.resolve('inputNumber'),
  select: () => componentFactory.resolve('select'),
  switch: () => componentFactory.resolve('switch'),
  radio: () => componentFactory.resolve('radio'),
  radioGroup: () => componentFactory.resolve('radioGroup'),
  checkbox: () => componentFactory.resolve('checkbox'),
  checkboxGroup: () => componentFactory.resolve('checkboxGroup'),
  datePicker: () => componentFactory.resolve('datePicker'),
  timePicker: () => componentFactory.resolve('timePicker'),
  cascader: () => componentFactory.resolve('cascader'),
  rate: () => componentFactory.resolve('rate'),
  slider: () => componentFactory.resolve('slider'),
}

// ----------------------------------------------------------------------------
// 值绑定属性表: 单字段 type -> 控件的 v-model 属性名 (逐一核对 antd v4 源码 emits)
// 大部分控件用 value; 例外是勾选语义的单个控件 Switch / Checkbox / Radio 用 checked,
// 而 RadioGroup / CheckboxGroup 虽然内部由 Radio / Checkbox 组成, 其自身 v-model 仍是 value。
// ----------------------------------------------------------------------------
const valuePropMap: Record<SingleFieldType, 'value' | 'checked'> = {
  input: 'value',
  textarea: 'value',
  inputNumber: 'value',
  select: 'value',
  datePicker: 'value',
  timePicker: 'value',
  cascader: 'value',
  rate: 'value',
  slider: 'value',
  radioGroup: 'value',
  checkboxGroup: 'value',
  switch: 'checked',
  radio: 'checked',
  checkbox: 'checked',
}

interface BaseFormProps {
  /** 表单 schema: form 为 a-form 原生 props, fields 为待递归渲染的节点树 */
  schema: FormSchema
  /** 受控初始值 / 外部回填值 (优先级高于 schema 内声明式初始值) */
  modelValue?: Record<string, unknown>
}

const props = defineProps<BaseFormProps>()
const emit = defineEmits<{ (e: 'update:modelValue', value: Record<string, unknown>): void }>()

type FormValues = Record<string, unknown>

// ----------------------------------------------------------------------------
// 表单状态: 一个 reactive model 承载运行时取值, 交给 antd Form + FormItem(name) 双向绑定
// ----------------------------------------------------------------------------
const formRef = ref<FormInstance>()
const model = reactive<FormValues>({})
/** schema / 外部播种的初始值快照, 供 reset 还原 */
const initialValues: FormValues = {}

/** 路径归一化: 'a.b.0' → ['a','b',0]; 数组原样返回 */
function toPath(path: FormPath): Array<string | number> {
  if (Array.isArray(path)) return path.slice()
  return String(path)
    .split('.')
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg))
}

/** 沿路径在 model 上写入 (自动补齐中间层), 与 antd Form 的嵌套 name 约定一致 */
function setPath(path: FormPath, value: unknown): void {
  const arr = toPath(path)
  if (!arr.length) return
  let cur: Record<string | number, unknown> = model
  for (let i = 0; i < arr.length - 1; i++) {
    const seg = arr[i]
    const next = arr[i + 1]
    if (typeof cur[seg] !== 'object' || cur[seg] === null) {
      cur[seg] = typeof next === 'number' ? [] : {}
    }
    cur = cur[seg] as Record<string | number, unknown>
  }
  cur[arr[arr.length - 1]] = value
}

/** 沿路径读取 model 中的值 */
function getPath(path: FormPath): unknown {
  const arr = toPath(path)
  let cur: unknown = model
  for (const seg of arr) {
    if (cur === null || cur === undefined) return undefined
    cur = (cur as Record<string | number, unknown>)[seg]
  }
  return cur
}

/** 从 schema 的字段 props 中取声明式初始值 (modelValue 优先, 其次 defaultValue / value) */
function presetOf(propsBag: Record<string, unknown>): unknown {
  return propsBag.modelValue ?? propsBag.defaultValue ?? propsBag.value
}

/** 遍历节点树, 收集 { name -> 声明式初始值 } */
function collectInitialValues(nodes: SchemaNode[]): FormValues {
  const acc: FormValues = {}
  const walk = (list: SchemaNode[]): void => {
    for (const node of list) {
      if (node.type === 'row' || node.type === 'col') {
        walk(node.children)
      } else if (node.type === 'group') {
        // 组本身不对应单一取值, 只递归收集其内部单字段
        walk(node.children)
      } else if (node.type === 'custom') {
        // 自定义控件的值完全由外部 modelValue / 交互管理, 无声明式初值可播种
      } else if (node.name !== undefined) {
        const preset = presetOf(node.props as Record<string, unknown>)
        if (preset !== undefined) acc[toPath(node.name).join('.')] = preset
      }
    }
  }
  walk(nodes)
  return acc
}

// 初始化 model: 先播种 schema 声明值, 再用外部 modelValue 覆盖
function seed(): void {
  const fromSchema = collectInitialValues(props.schema.fields)
  for (const key of Object.keys(fromSchema)) setPath(key, fromSchema[key])
  if (props.modelValue) deepAssign(model, props.modelValue)
  Object.assign(initialValues, JSON.parse(JSON.stringify(model)))
}

/** 把 source 的可枚举键深写入 target (仅 plain object 递归, 其余整体覆盖) */
function deepAssign(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const next = source[key]
    if (next && typeof next === 'object' && !Array.isArray(next) && !(next instanceof Date)) {
      if (typeof target[key] !== 'object' || target[key] === null) target[key] = {}
      deepAssign(target[key] as Record<string, unknown>, next as Record<string, unknown>)
    } else {
      target[key] = next
    }
  }
}

seed()

// 外部受控回填: modelValue 变化时合并进 model (不覆盖用户未触及之外的输入需自行控制)
watch(
  () => props.modelValue,
  (value) => {
    if (value) deepAssign(model, value)
  },
  { deep: true },
)

// ----------------------------------------------------------------------------
// 渲染函数 (递归)
// ----------------------------------------------------------------------------

/** antd 基本控件: 从工厂按 type 解析 + 显式 v-model 绑定 model + v-slots */
function renderComponent(field: SingleField): VNode {
  const Comp = componentMap[field.type]()
  const { modelValue: _m, defaultValue: _d, value: _v, ...rest } = field.props as Record<string, unknown>
  const binding: Record<string, unknown> = {}
  if (field.name !== undefined) {
    // FormItem 不注入受控值, 这里手动把 model 上的当前值与回写钩子绑到控件
    const path = toPath(field.name)
    const prop = valuePropMap[field.type]
    binding[prop] = getPath(path)
    binding[`onUpdate:${prop}`] = (val: unknown) => setPath(path, val)
  }
  return h(Comp, { ...rest, ...binding }, field.slots)
}

/** 自定义控件: 直接组件自带 v-model(modelValue) 与运行时 model 双向绑定 */
function renderCustomComponent(field: CustomField): VNode {
  const binding: Record<string, unknown> = {}
  if (field.name !== undefined) {
    const path = toPath(field.name)
    binding.modelValue = getPath(path)
    binding['onUpdate:modelValue'] = (val: unknown) => setPath(path, val)
  }
  return h(field.component, { ...field.props, ...binding }, field.slots)
}

/** 字段外壳: 统一生成 FormItem, item 配置整体透传给 a-form-item, name 走归一化数组 */
function withFormItem(
  field: SingleField | GroupField | CustomField,
  content: () => VNode | VNode[],
): VNode {
  const name = field.name === undefined ? undefined : toPath(field.name)
  return (
    <FormItem name={name} {...field.item}>
      {content()}
    </FormItem>
  )
}

/** SingleField: FormItem -> 基本控件 */
function renderField(node: SingleField): VNode {
  return withFormItem(node, () => renderComponent(node))
}

/** CustomField: FormItem -> 自定义控件 (复杂输入, 基本组件无法表达时使用) */
function renderCustom(node: CustomField): VNode {
  return withFormItem(node, () => renderCustomComponent(node))
}

/** GroupField: 一个 FormItem 内并排渲染多个控件 (组内仅允许 SingleField) */
function renderGroup(node: GroupField): VNode {
  return withFormItem(node, () => node.children.map(renderComponent))
}

/** Row: 布局容器, 不生成 FormItem, children 原样递归 */
function renderRow(node: RowField): VNode {
  return <ARow {...node.props}>{node.children.map(renderNode)}</ARow>
}

/** Col: 布局容器, children 原样递归 */
function renderCol(node: ColField): VNode {
  return <ACol {...node.props}>{node.children.map(renderNode)}</ACol>
}

/** 递归分发: 借助 type 可辨识联合自动收窄具体节点类型 */
function renderNode(node: SchemaNode): VNode {
  switch (node.type) {
    case 'row':
      return renderRow(node)
    case 'col':
      return renderCol(node)
    case 'group':
      return renderGroup(node)
    case 'custom':
      return renderCustom(node)
    default:
      return renderField(node)
  }
}

// ----------------------------------------------------------------------------
// 对外 API
// ----------------------------------------------------------------------------

/** 深拷贝 model 为纯 JS 对象 (剥离 reactive 代理), 供 submit / getValues 返回 */
function plainValues(): FormValues {
  return JSON.parse(JSON.stringify(model)) as FormValues
}

/** 校验并返回当前表单值: 失败 reject 校验错误, 成功返回纯 JS 对象 */
async function submit(): Promise<FormValues> {
  await formRef.value?.validate()
  const values = plainValues()
  emit('update:modelValue', values)
  return values
}

/** 不校验直接取当前值 */
function getValues(): FormValues {
  return plainValues()
}

/** 清空 model 后回填初始值快照, 并清除校验态 */
function resetFields(): void {
  for (const key of Object.keys(model)) delete model[key]
  deepAssign(model, JSON.parse(JSON.stringify(initialValues)))
  formRef.value?.clearValidate()
}

defineExpose({ submit, getValues, resetFields, formRef })

/**
 * NodeRenderer — 函数式组件, 把 TSX 递归结果桥接到 <template>
 * <script setup lang="tsx"> 的模板只能是合法 Vue 模板语法, 无法直接写 JSX,
 * 因此用一个返回 renderNode(node) 的函数式组件在 v-for 中挂载整棵递归树。
 */
const NodeRenderer = (nodeProps: { node: SchemaNode }): VNode => renderNode(nodeProps.node)
</script>

<template>
  <Form ref="formRef" v-bind="props.schema.form" :model="model">
    <NodeRenderer v-for="(node, index) in props.schema.fields" :key="index" :node="node" />
  </Form>
</template>
