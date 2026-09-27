<template>
  <div class="page-container">
    <a-card :bordered="false">
      <template #title>
        <div class="card-header">
          <span>监听群组管理</span>
          <a-button type="primary" @click="openDialog()">添加群组</a-button>
        </div>
      </template>

      <a-table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        row-key="id"
        bordered
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'success' : 'error'">
              {{ record.enabled ? '已启用' : '已禁用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" type="link" @click="openDialog(record)">编辑</a-button>
              <a-popconfirm
                title="确定删除该群组吗？"
                ok-text="删除"
                cancel-text="取消"
                @confirm="handleDelete(record.groupId)"
              >
                <a-button size="small" type="link" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 添加/编辑对话框 -->
    <a-modal
      v-model:open="dialogVisible"
      :title="isEdit ? '编辑群组' : '添加群组'"
      :confirm-loading="saving"
      @ok="handleSave"
    >
      <a-form :model="form" layout="vertical" class="pt-2">
        <a-form-item label="群号" required>
          <a-input v-model:value="form.groupId" :disabled="isEdit" placeholder="请输入群号" />
        </a-form-item>
        <a-form-item label="启用状态">
          <a-switch
            v-model:checked="form.enabled"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { GroupListenApi } from '@/api'
import type { GroupListen } from '@/api'

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '群号', dataIndex: 'groupId', key: 'groupId' },
  { title: '启用状态', key: 'enabled', width: 120 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const tableData = ref<GroupListen[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref<{ groupId: string, enabled: boolean }>({ groupId: '', enabled: true })

const fetchData = async () => {
  loading.value = true
  try {
    const res = await GroupListenApi.list()
    tableData.value = res.data || []
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: GroupListen) => {
  if (row) {
    isEdit.value = true
    form.value = { groupId: row.groupId, enabled: row.enabled }
  } else {
    isEdit.value = false
    form.value = { groupId: '', enabled: true }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.groupId.trim()) {
    message.warning('请输入群号')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await GroupListenApi.update(form.value.groupId, { enabled: form.value.enabled })
      message.success('更新成功')
    } else {
      await GroupListenApi.create({ groupId: form.value.groupId, enabled: form.value.enabled })
      message.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (groupId: string) => {
  await GroupListenApi.delete(groupId)
  message.success('删除成功')
  fetchData()
}

onMounted(fetchData)
</script>
