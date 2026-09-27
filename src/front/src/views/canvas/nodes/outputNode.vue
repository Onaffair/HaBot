<script setup lang="ts">
// 输出节点: 流程终点, 到达即把上游消息构建节点产出的消息发送出去。
// 本身无配置表单 (消息内容在 message 节点构建), 因此不展示设置图标。
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import { nodeRegistry } from '../registry'
import type { OutputNodeData } from '../types'

const props = defineProps<NodeProps<OutputNodeData>>()

const def = computed(() => nodeRegistry.resolve('output'))
</script>

<template>
  <BaseNode
    :node-id="id"
    :label="data.label"
    description="流程终点 · 发送消息"
    :icon="def?.icon"
    :color="def?.color"
    :handles="def?.handles"
    :selected="selected"
    :show-config="false"
  >
    <div class="output-node__tip">发送上游构建的消息并结束</div>
  </BaseNode>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.output-node__tip {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
