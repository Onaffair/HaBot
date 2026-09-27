// ============================================================================
// AI 处理节点配置表单 schema
// ----------------------------------------------------------------------------
// model 即节点 data (AiNodeData)。均为基本控件字段。
// ============================================================================
import type { FormSchema } from '@/component/antd'

export const aiFormSchema: FormSchema = {
  form: { layout: 'vertical' },
  fields: [
    {
      type: 'input',
      name: 'label',
      item: { label: '节点名称', rules: [{ required: true, message: '请输入节点名称' }] },
      props: { placeholder: '例如：意图理解' },
    },
    {
      type: 'select',
      name: 'model',
      item: { label: '模型' },
      props: {
        placeholder: '选择模型',
        options: [
          { label: 'GPT-4o', value: 'gpt-4o' },
          { label: 'GLM-4-Plus', value: 'glm-4-plus' },
          { label: 'DeepSeek-V3', value: 'deepseek-v3' },
        ],
      },
    },
    {
      type: 'textarea',
      name: 'systemPrompt',
      item: { label: '系统提示词' },
      props: { rows: 4, placeholder: '设定角色与输出要求' },
    },
    {
      type: 'slider',
      name: 'temperature',
      item: { label: '温度', tooltip: '越高越发散，越低越确定' },
      props: { min: 0, max: 2, step: 0.1 },
    },
    {
      type: 'inputNumber',
      name: 'maxTokens',
      item: { label: '最大 Token' },
      props: { min: 1, max: 8192, controls: true },
    },
  ],
}
