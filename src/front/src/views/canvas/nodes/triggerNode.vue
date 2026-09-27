<script setup lang="ts">
// 触发节点: 展示命中方式与关键词概要, 外观与端口由注册表定义驱动
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import { nodeRegistry } from '../registry'
import type { TriggerNodeData } from '../types'

const props = defineProps<NodeProps<TriggerNodeData>>()

const def = computed(() => nodeRegistry.resolve('trigger'))

const AT_ME_LABEL: Record<TriggerNodeData['atMe'], string> = {
  yes: '@我',
  no: '不@',
  any: '任意',
}

const summary = computed(() => {
  const d = props.data
  const parts: string[] = []
  if (d.keywords?.length) parts.push(`关键词 ${d.keywords.length} 个`)
  if (d.pattern) parts.push(`正则：${d.pattern}`)
  return parts.length ? parts.join(' · ') : '接收所有消息'
})
</script>

<template>
  <BaseNode
    :node-id="id"
    :label="data.label"
    :description="data.description"
    :icon="def?.icon"
    :color="def?.color"
    :handles="def?.handles"
    :selected="selected"
  >
    <div class="trigger-node__meta">
      <span class="trigger-node__tag">{{ AT_ME_LABEL[data.atMe] }}</span>
      <span>{{ summary }}</span>
    </div>
  </BaseNode>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.trigger-node__meta {
  display: flex;
  align-items: center;
  gap: @spacing-xs;
}

.trigger-node__tag {
  padding: 0 6px;
  font-size: 11px;
  color: @brand-color;
  background: rgba(22, 119, 255, 0.08);
  border-radius: @radius-sm;
}
</style>
