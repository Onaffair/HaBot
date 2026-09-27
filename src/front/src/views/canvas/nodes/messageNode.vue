<script setup lang="ts">
// 消息构建节点: 以标签形式概览已组装的消息段序列
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import BaseNode from './BaseNode.vue'
import { nodeRegistry } from '../registry'
import type { MessageNodeData, MessageSegment, MessageSegmentType } from '../types'

const props = defineProps<NodeProps<MessageNodeData>>()

const def = computed(() => nodeRegistry.resolve('message'))

// 段类型 → 卡片上的短标签
const SEGMENT_SHORT: Record<MessageSegmentType, string> = {
  text: '文字',
  at: '@',
  image: '图片',
  video: '视频',
  record: '语音',
  face: '表情',
  poke: '戳',
}

/** 单个段的简述: 文字带内容、@ 带目标、文件带文件名 */
function describe(seg: MessageSegment): string {
  switch (seg.type) {
    case 'text':
      return seg.text ? `${SEGMENT_SHORT.text}：${seg.text.slice(0, 8)}${seg.text.length > 8 ? '…' : ''}` : SEGMENT_SHORT.text
    case 'at':
      return `@${seg.qq === 'all' ? '全体' : seg.name || seg.qq || '?'}`
    case 'image':
    case 'video':
    case 'record':
      // 仅展示资源地址; 目录/具体文件的语义由底层发送时判断
      return seg.file ? `${SEGMENT_SHORT[seg.type]}：${seg.file}` : SEGMENT_SHORT[seg.type]
    default:
      return SEGMENT_SHORT[seg.type]
  }
}
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
    <div class="message-node__segs">
      <span v-if="!data.segments?.length" class="message-node__empty">尚未添加消息段</span>
      <span v-for="(s, i) in data.segments" v-else :key="i" class="message-node__chip">
        {{ describe(s) }}
      </span>
    </div>
  </BaseNode>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.message-node__segs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 220px;
}

.message-node__chip {
  padding: 1px 6px;
  font-size: 11px;
  color: @text-color;
  background: @layout-bg;
  border: 1px solid @border-color-split;
  border-radius: @radius-sm;
}

.message-node__empty {
  color: @text-color-secondary;
  font-style: italic;
}
</style>
