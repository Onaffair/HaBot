// ============================================================================
// 条件节点配置表单 schema
// ----------------------------------------------------------------------------
// model 即节点 data (ConditionNodeData)。均为基本控件字段。
// ============================================================================
import type { FormSchema } from '@/component/antd'

export const conditionFormSchema: FormSchema = {
  form: { layout: 'vertical' },
  fields: [
    {
      type: 'input',
      name: 'label',
      item: { label: '节点名称', rules: [{ required: true, message: '请输入节点名称' }] },
      props: { placeholder: '例如：是否为敏感请求' },
    },
    {
      type: 'input',
      name: 'description',
      item: { label: '备注' },
      props: { placeholder: '分支含义说明（可选）' },
    },
    {
      type: 'textarea',
      name: 'expression',
      item: { label: '判定表达式', tooltip: '结果为真走 true 出口，为假走 false 出口' },
      props: { rows: 3, placeholder: '例如：{{intent}} === "query"' },
    },
  ],
}
