// ============================================================================
// 消息构建节点配置表单 schema
// ----------------------------------------------------------------------------
// model 即节点 data (MessageNodeData)。
// 消息段是可增删改排序的列表, 无法用 antd 基本控件表达, 故用自定义控件
// SegmentEditor (type:'custom') 承载; BaseForm 对 custom 类型自动桥接
// modelValue <-> model[name], 无需额外配置。label / description 等基本字段
// 仍用 SingleField 声明。
// ============================================================================
import type { FormSchema } from '@/component/antd'
import SegmentEditor from './segmentEditor.vue'

export const messageFormSchema: FormSchema = {
  form: { layout: 'vertical' },
  fields: [
    {
      type: 'input',
      name: 'label',
      item: { label: '节点名称', rules: [{ required: true, message: '请输入节点名称' }] },
      props: { placeholder: '例如：构建回复消息' },
    },
    {
      type: 'input',
      name: 'description',
      item: { label: '备注' },
      props: { placeholder: '节点用途说明（可选）' },
    },
    {
      type: 'custom',
      name: 'segments',
      component: SegmentEditor,
      item: { label: '消息内容' },
      props: {},
    },
  ],
}
