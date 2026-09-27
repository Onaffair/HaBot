<script setup lang="ts">
// ============================================================================
// 画布列表 — 流程画布的统一维护入口
// ----------------------------------------------------------------------------
// - 数据经 useTable(CanvasApi.list) 获取：后端返回顶层 { list, total } 分页结构
// - 搜索 / 翻页 / 改页长均由 useTable 的 watch 自动触发请求
// - 点击画布名称或「打开」进入画布编辑器 (/canvas/:id)
// - 新建画布成功后直接进入编辑；重命名 / 启停 / 删除在列表内完成并做局部更新
// ============================================================================
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useTable } from '@/composible/useTable'
import { CanvasApi } from '@/api'
import type { CanvasBrief } from '@/api/types'

const router = useRouter()

// 列表数据：params.keyword 作为名称搜索条件，改动即自动重新拉取
const { dataSource, pagination, params, loading } = useTable<CanvasBrief>(CanvasApi.list, {
  keyword: '',
})

/** 表格列定义 */
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '节点', dataIndex: 'nodeCount', key: 'nodeCount', width: 70 },
  { title: '连线', dataIndex: 'edgeCount', key: 'edgeCount', width: 70 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
  { title: '操作', key: 'actions', width: 150 },
]

/** 分页切换：写回 useTable 的 pagination 触发请求 */
function onPageChange(page: number, size: number) {
  pagination.pageNum = page
  pagination.pageSize = size
}

function openCanvas(record: CanvasBrief) {
  router.push(`/canvas/${record.id}`)
}

function formatTime(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

// --------------------------------------------------------------------------
// 新建 / 重命名弹窗
// --------------------------------------------------------------------------
const modalVisible = ref(false)
const modalLoading = ref(false)
/** 非空表示编辑既有画布（重命名），为空表示新建 */
const modalId = ref<number | null>(null)
const modalModel = reactive({ name: '', description: '' })

function openCreate() {
  modalId.value = null
  modalModel.name = ''
  modalModel.description = ''
  modalVisible.value = true
}

function openRename(record: CanvasBrief) {
  modalId.value = record.id
  modalModel.name = record.name
  modalModel.description = record.description || ''
  modalVisible.value = true
}

async function submitModal() {
  const name = modalModel.name.trim()
  if (!name) {
    message.warning('请输入画布名称')
    return
  }
  modalLoading.value = true
  try {
    if (modalId.value) {
      // 重命名/改描述：接口返回最新资源，列表做局部更新避免整页刷新
      const updated = await CanvasApi.update(modalId.value, {
        name,
        description: modalModel.description,
      })
      const row = dataSource.value.find((r) => r.id === modalId.value)
      if (row) {
        row.name = updated.name
        row.description = updated.description
        row.updatedAt = updated.updatedAt
      }
      message.success('已更新')
      modalVisible.value = false
    } else {
      // 新建空画布并直接进入编辑器
      const created = await CanvasApi.create({
        name,
        description: modalModel.description,
        nodes: [],
        edges: [],
      })
      message.success('创建成功')
      router.push(`/canvas/${created.id}`)
    }
  } finally {
    modalLoading.value = false
  }
}

// --------------------------------------------------------------------------
// 启用切换 / 删除（局部更新）
// --------------------------------------------------------------------------
async function onToggle(record: any, enabled: boolean) {
  const updated = await CanvasApi.toggle(record.id, enabled)
  record.enabled = updated.enabled
}

async function onDelete(record: CanvasBrief) {
  await CanvasApi.delete(record.id)
  const index = dataSource.value.findIndex((r) => r.id === record.id)
  if (index >= 0) dataSource.value.splice(index, 1)
  pagination.total = Math.max(0, pagination.total - 1)
  message.success('删除成功')
}
</script>

<template>
  <div class="canvas-list">
    <div class="canvas-list__toolbar">
      <div class="canvas-list__title">流程画布</div>
      <a-space>
        <a-input-search
          v-model:value="params.keyword"
          placeholder="按名称搜索"
          allow-clear
          style="width: 220px"
        />
        <a-button type="primary" @click="openCreate">+ 新建画布</a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      row-key="id"
      size="middle"
      :pagination="{
        current: pagination.pageNum,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        onChange: onPageChange,
      }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a class="canvas-list__name" @click="openCanvas(record)">{{ record.name }}</a>
        </template>
        <template v-else-if="column.key === 'description'">
          <span class="canvas-list__desc">{{ record.description || '-' }}</span>
        </template>
        <template v-else-if="column.key === 'enabled'">
          <a-switch
            :checked="record.enabled"
            checked-children="启用"
            un-checked-children="停用"
            size="small"
            @change="onToggle(record, $event)"
          />
        </template>
        <template v-else-if="column.key === 'updatedAt'">
          {{ formatTime(record.updatedAt) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" type="link" @click="openCanvas(record)">打开</a-button>
            <a-button size="small" type="link" @click="openRename(record)">重命名</a-button>
            <a-popconfirm title="删除后不可恢复，确认？" ok-text="删除" @confirm="onDelete(record)">
              <a-button size="small" type="link" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新建 / 重命名弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalId ? '重命名画布' : '新建画布'"
      :confirm-loading="modalLoading"
      @ok="submitModal"
    >
      <a-form layout="vertical">
        <a-form-item label="名称" required>
          <a-input v-model:value="modalModel.name" placeholder="画布名称（唯一）" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea
            v-model:value="modalModel.description"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            placeholder="可选，简要说明该流程的用途"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
@import '@/styles/variables.less';

.canvas-list {
  padding: @spacing-md;
  background: #fff;
  border-radius: @radius-md;

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: @spacing-md;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: @text-color;
  }

  &__name {
    color: @brand-color;
    cursor: pointer;
  }

  &__desc {
    color: @text-color-secondary;
  }
}
</style>
