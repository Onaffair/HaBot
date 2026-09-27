<script setup lang="ts">
// ============================================================================
// BaseNode — 自定义节点通用外壳
// ----------------------------------------------------------------------------
// 职责：统一节点外观 (标题栏 + 图标 + 备注 + 内容插槽) 并按 handles 声明渲染
// vue-flow 的连接端点。具体节点组件只需传入元信息并提供默认插槽内容。
// - target 端点渲染在左侧, source 端点渲染在右侧
// - 多 source 端点 (如条件的 true/false) 沿垂直方向均布, 并展示端点标签
// ============================================================================
import { computed, inject } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { SettingOutlined } from '@ant-design/icons-vue'
import type { NodeHandleSpec } from '../types'
import { OpenConfigKey } from '../panelContext'

const props = withDefaults(
  defineProps<{
    /** 节点 id, 点击设置图标时回传给画布定位节点 */
    nodeId?: string
    /** 标题 */
    label: string
    /** 图标 (emoji / 字形) */
    icon?: string
    /** 主题色, 用于左侧强调条与选中边框 */
    color?: string
    /** 备注说明 */
    description?: string
    /** 端点声明 */
    handles?: NodeHandleSpec[]
    /** 是否选中 (来自 vue-flow 节点 props) */
    selected?: boolean
    /** 是否展示右上角设置图标: 无配置表单的节点 (如输出) 传 false */
    showConfig?: boolean
  }>(),
  {
    color: '#1677ff',
    handles: () => [],
    selected: false,
    showConfig: true,
  },
)

// 点击设置图标: 通知画布打开本节点的配置面板
const openConfig = inject(OpenConfigKey, () => {})

const targetHandles = computed(() => props.handles.filter((h) => h.type === 'target'))
const sourceHandles = computed(() => props.handles.filter((h) => h.type === 'source'))

/** 计算多端点的纵向位置: 单端点居中, 多端点均布 */
function handleTop(index: number, total: number): string {
  if (total <= 1) return '50%'
  // 在 25% ~ 75% 区间均布, 保证不贴边
  return `${25 + (index * 50) / (total - 1)}%`
}
</script>

<template>
  <div
    class="graph-node"
    :class="{ 'is-selected': selected }"
    :style="{ ['--node-accent' as any]: color }"
  >
    <!-- 右上角设置图标: 点击打开节点配置面板 (无配置表单的节点不展示) -->
    <span
      v-if="showConfig"
      class="graph-node__config nodrag"
      @click.stop="openConfig(nodeId || '')"
    >
      <SettingOutlined />
    </span>
    <!-- 输入端点 -->
    <Handle
      v-for="(h, i) in targetHandles"
      :id="h.id"
      :key="`t-${h.id}`"
      :type="'target'"
      :position="Position.Left"
      class="graph-node__handle"
      :style="{ top: handleTop(i, targetHandles.length) }"
    />

    <div class="graph-node__header">
      <span v-if="icon" class="graph-node__icon">{{ icon }}</span>
      <span class="graph-node__title">{{ label }}</span>
    </div>
    <div v-if="description" class="graph-node__desc">{{ description }}</div>

    <!-- 节点内容区: 由各具体节点填充概要信息 -->
    <div class="graph-node__body">
      <slot />
    </div>

    <!-- 输出端点 -->
    <Handle
      v-for="(h, i) in sourceHandles"
      :id="h.id"
      :key="`s-${h.id}`"
      :type="'source'"
      :position="Position.Right"
      class="graph-node__handle graph-node__handle--source"
      :style="{ top: handleTop(i, sourceHandles.length) }"
    >
      <span v-if="h.label && sourceHandles.length > 1" class="graph-node__handle-label">
        {{ h.label }}
      </span>
    </Handle>
  </div>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.graph-node {
  position: relative;
  min-width: 180px;
  padding: @spacing-sm @spacing-md;
  background: #fff;
  border: 1px solid @border-color-split;
  border-left: 3px solid var(--node-accent, @brand-color);
  border-radius: @radius-md;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;

  &.is-selected {
    border-color: var(--node-accent, @brand-color);
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: @spacing-xs;
    padding-right: 20px; // 预留右上角设置图标位置
  }

  &__config {
    position: absolute;
    top: 6px;
    right: 8px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    color: @text-color-secondary;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    transition: color 0.15s ease, transform 0.15s ease;

    &:hover {
      color: var(--node-accent, @brand-color);
      transform: rotate(45deg);
    }
  }

  &__icon {
    font-size: 15px;
    line-height: 1;
  }

  &__title {
    font-weight: 600;
    color: @text-color;
  }

  &__desc {
    margin-top: 2px;
    font-size: 12px;
    color: @text-color-secondary;
  }

  &__body {
    margin-top: @spacing-sm;
    font-size: 12px;
    color: @text-color-secondary;
  }

  &__handle {
    width: 10px;
    height: 10px;
    background: #fff;
    border: 2px solid var(--node-accent, @brand-color);

    &--source {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
  }

  &__handle-label {
    position: absolute;
    right: 14px;
    white-space: nowrap;
    font-size: 11px;
    color: @text-color-secondary;
  }
}
</style>
