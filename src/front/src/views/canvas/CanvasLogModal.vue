<script setup lang="ts">
// ============================================================================
// 画布流转日志弹窗 — 单张画布的运行回溯
// ----------------------------------------------------------------------------
// - 列表数据同样走 useTable：包一层 CanvasApi.logs(canvasId, params) 适配其入参
// - 后端返回顶层 { list, total } 分页结构，翻页 / 改页长由 useTable 自动触发请求
// - 流转状态即异常入口：status=error 时标签转红，悬停展示引擎记录的失败节点摘要
// - 由父级 v-if 控制挂载：打开时才创建实例并发首个请求，关闭即卸载
// ============================================================================
import { useTable } from '@/composible/useTable'
import { CanvasApi } from '@/api'
import type { CanvasFlowLog } from '@/api/types'

const props = defineProps<{
  /** 弹窗显隐（配合父级 v-model:open） */
  open: boolean
  canvasId: number
  canvasName?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
}>()

const columns = [
  { title: '群号', dataIndex: 'groupId', key: 'groupId', width: 130 },
  { title: '消息内容', dataIndex: 'message', key: 'message', ellipsis: true },
  { title: '流转状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '消息时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
]

const { dataSource, pagination, loading } = useTable<CanvasFlowLog>((p) =>
  CanvasApi.logs(props.canvasId, p),
)

/** 分页切换：写回 useTable 的 pagination 触发请求 */
function onPageChange(page: number, size: number) {
  pagination.pageNum = page
  pagination.pageSize = size
}

function formatTime(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

function onClose() {
  emit('update:open', false)
}
</script>

<template>
  <a-modal
    :open="open"
    :title="`流转日志${canvasName ? ` · ${canvasName}` : ''}`"
    :footer="null"
    :width="860"
    @cancel="onClose"
  >
    <div class="canvas-log">
      <div class="canvas-log__hint">共 {{ pagination.total }} 条，每张画布仅保留最近 200 条流转记录</div>

      <a-table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        row-key="id"
        size="small"
        :pagination="{
          current: pagination.pageNum,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          size: 'small',
          onChange: onPageChange,
        }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'groupId'">
            {{ record.groupId || '-' }}
          </template>
          <template v-else-if="column.key === 'message'">
            <a-tooltip v-if="record.message" :title="record.message" placement="topLeft">
              <span>{{ record.message }}</span>
            </a-tooltip>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <!-- 异常态悬停给出「失败节点(类型): 原因」摘要，多条异常以分号连接 -->
            <a-tooltip
              v-if="record.status !== 'success'"
              placement="top"
              :overlay-style="{ maxWidth: '480px' }"
              :title="record.error || '未记录异常详情'"
            >
              <a-tag color="red" class="canvas-log__status">异常</a-tag>
            </a-tooltip>
            <a-tag v-else color="green">正常</a-tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>
        </template>
      </a-table>
    </div>
  </a-modal>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.canvas-log {
  &__hint {
    margin-bottom: @spacing-sm;
    font-size: 12px;
    color: @text-color-secondary;
  }

  // 悬停热区需要覆盖整个标签，异常态加虚线底提示可交互
  &__status {
    cursor: help;
    border-style: dashed;
  }
}
</style>
