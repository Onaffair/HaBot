<script setup lang="ts">
// 条件节点: 按表达式布尔结果分流, 拥有 true / false 两个出口
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import { nodeRegistry } from '../registry'
import type { ConditionNodeData } from '../types'

const props = defineProps<NodeProps<ConditionNodeData>>()

const def = computed(() => nodeRegistry.resolve('condition'))
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
    <div class="condition-node__expr">{{ data.expression || '未设置判定表达式' }}</div>
  </BaseNode>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.condition-node__expr {
  max-width: 200px;
  padding: 2px 6px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  background: @layout-bg;
  border-radius: @radius-sm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
