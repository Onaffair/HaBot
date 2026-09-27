// ============================================================================
// 触发节点配置表单 schema
// ----------------------------------------------------------------------------
// model 即节点 data (TriggerNodeData); 字段 name 对应 data 中的键。
// 均为 antd 基本控件可表达的简单字段, 直接用 SingleField 声明。
// ============================================================================
import type { FormSchema } from '@/component/antd'

export const triggerFormSchema: FormSchema = {
  form: { layout: 'vertical' },
  fields: [
    {
      type: 'input',
      name: 'label',
      item: { label: '节点名称', rules: [{ required: true, message: '请输入节点名称' }] },
      props: { placeholder: '例如：群消息触发' },
    },
    {
      type: 'input',
      name: 'description',
      item: { label: '备注' },
      props: { placeholder: '节点用途说明（可选）' },
    },
    {
      type: 'radioGroup',
      name: 'atMe',
      item: { label: '是否@我' },
      props: {
        optionType: 'button',
        options: [
          { label: '是', value: 'yes' },
          { label: '否', value: 'no' },
          { label: '任意', value: 'any' },
        ],
      },
    },
    {
      type: 'select',
      name: 'keywords',
      item: { label: '关键词', tooltip: '输入后回车添加，命中任一关键词即触发' },
      props: { mode: 'tags', tokenSeparators: [','], placeholder: '添加关键词' },
    },
    {
      type: 'input',
      name: 'pattern',
      item: { label: '正则表达式' },
      props: { placeholder: '可选，非空时参与消息匹配' },
    },
  ],
}
