<script setup lang="ts">
// AI 处理节点: 展示模型与采样参数概要
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import { nodeRegistry } from '../registry'
import type { AiNodeData } from '../types'

const props = defineProps<NodeProps<AiNodeData>>()

const def = computed(() => nodeRegistry.resolve('ai'))

const meta = computed(() => `temp ${props.data.temperature ?? '-'} · max ${props.data.maxTokens ?? '-'}`)
</script>

<template>
  <BaseNode
    :node-id="id"
    :label="data.label"
    :description="data.model"
    :icon="def?.icon"
    :color="def?.color"
    :handles="def?.handles"
    :selected="selected"
  >
    <div class="ai-node__meta">{{ meta }}</div>
  </BaseNode>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.ai-node__meta {
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: @text-color-secondary;
}
</style>
