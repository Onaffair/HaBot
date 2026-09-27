// ============================================================================
// 自定义节点聚合入口
// ----------------------------------------------------------------------------
// 职责：为每一类节点组装 NodeDefinition (组件 + 端口 + 表单 + 默认数据)，
// 并注册到 nodeRegistry。新增节点类别时在此追加一条 register 即可，
// 画布与配置面板均通过注册表动态获取，无需改动主视图。
// ============================================================================
import { markRaw } from 'vue'
import { nodeRegistry } from '../registry'
import type { NodeDefinition } from '../types'
import { triggerFormSchema, aiFormSchema, conditionFormSchema, messageFormSchema } from '../forms'

import TriggerNode from './triggerNode.vue'
import AiNode from './aiNode.vue'
import ConditionNode from './conditionNode.vue'
import OutputNode from './outputNode.vue'
import MessageNode from './messageNode.vue'

// --------------------------------------------------------------------------
// 触发节点
// --------------------------------------------------------------------------
const triggerDef: NodeDefinition = {
  type: 'trigger',
  label: '触发器',
  icon: '⚡',
  color: '#1677ff',
  component: markRaw(TriggerNode),
  handles: [{ id: 'default', type: 'source' }],
  formSchema: triggerFormSchema,
  createData: () => ({ label: '新触发器', atMe: 'any', keywords: [] }),
}

// --------------------------------------------------------------------------
// AI 处理节点
// --------------------------------------------------------------------------
const aiDef: NodeDefinition = {
  type: 'ai',
  label: 'AI 处理',
  icon: '🤖',
  color: '#722ed1',
  component: markRaw(AiNode),
  handles: [
    { id: 'default', type: 'target' },
    { id: 'default', type: 'source' },
  ],
  formSchema: aiFormSchema,
  createData: () => ({
    label: 'AI 处理',
    model: 'gpt-4o',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1024,
  }),
}

// --------------------------------------------------------------------------
// 条件节点: true / false 两个出口
// --------------------------------------------------------------------------
const conditionDef: NodeDefinition = {
  type: 'condition',
  label: '条件分支',
  icon: '🔀',
  color: '#faad14',
  component: markRaw(ConditionNode),
  handles: [
    { id: 'default', type: 'target' },
    { id: 'true', type: 'source', label: '真' },
    { id: 'false', type: 'source', label: '假' },
  ],
  formSchema: conditionFormSchema,
  createData: () => ({ label: '条件分支', expression: '' }),
}

// --------------------------------------------------------------------------
// 输出节点: 流程终点, 到达即发送上游消息构建节点产出的消息, 无自身配置
// --------------------------------------------------------------------------
const outputDef: NodeDefinition = {
  type: 'output',
  label: '输出回复',
  icon: '📤',
  color: '#52c41a',
  component: markRaw(OutputNode),
  handles: [{ id: 'default', type: 'target' }],
  createData: () => ({ label: '输出回复' }),
}

// --------------------------------------------------------------------------
// 消息构建节点: 组装 OneBot 消息段 (文字/图片/视频/语音/@/表情/戳一戳)
// --------------------------------------------------------------------------
const messageDef: NodeDefinition = {
  type: 'message',
  label: '消息构建',
  icon: '💬',
  color: '#13c2c2',
  component: markRaw(MessageNode),
  handles: [
    { id: 'default', type: 'target' },
    { id: 'default', type: 'source' },
  ],
  formSchema: messageFormSchema,
  createData: () => ({ label: '消息构建', segments: [] }),
}

// 依次注册 (工具栏顺序即注册顺序)
nodeRegistry
  .register(triggerDef)
  .register(aiDef)
  .register(conditionDef)
  .register(outputDef)
  .register(messageDef)

export { triggerDef, aiDef, conditionDef, outputDef, messageDef }
