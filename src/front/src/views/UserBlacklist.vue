<template>
  <div class="page-container">
    <a-card :bordered="false">
      <template #title>
        <div class="card-header">
          <span>用户黑名单管理</span>
          <a-button type="primary" @click="openDialog()">添加黑名单</a-button>
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
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button size="small" type="link" @click="openDialog(record)">编辑原因</a-button>
              <a-popconfirm
                title="确定移出黑名单吗？"
                ok-text="移出"
                cancel-text="取消"
                @confirm="handleDelete(record.qq)"
              >
                <a-button size="small" type="link" danger>移出</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="dialogVisible"
      :title="isEdit ? '编辑黑名单' : '添加黑名单'"
      :confirm-loading="saving"
      @ok="handleSave"
    >
      <a-form :model="form" layout="vertical" class="pt-2">
        <a-form-item label="QQ号" required>
          <a-input v-model:value="form.qq" :disabled="isEdit" placeholder="请输入QQ号" />
        </a-form-item>
        <a-form-item label="拉黑原因">
          <a-textarea v-model:value="form.reason" :rows="3" placeholder="请输入拉黑原因（可选）" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { UserBlacklistApi } from '@/api'
import type { UserBlacklist } from '@/api'

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'QQ号', dataIndex: 'qq', key: 'qq', width: 180 },
  { title: '拉黑原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '添加时间', dataIndex: 'createdAt', key: 'createdAt', width: 200 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const tableData = ref<UserBlacklist[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref<{ qq: string, reason: string }>({ qq: '', reason: '' })

const fetchData = async () => {
  loading.value = true
  try {
    const res = await UserBlacklistApi.list()
    tableData.value = res.data || []
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: UserBlacklist) => {
  if (row) {
    isEdit.value = true
    form.value = { qq: row.qq, reason: row.reason || '' }
  } else {
    isEdit.value = false
    form.value = { qq: '', reason: '' }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.qq.trim()) {
    message.warning('请输入QQ号')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await UserBlacklistApi.update(form.value.qq, { reason: form.value.reason })
      message.success('更新成功')
    } else {
      await UserBlacklistApi.create({
        qq: form.value.qq,
        reason: form.value.reason || undefined,
      })
      message.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (qq: string) => {
  await UserBlacklistApi.delete(qq)
  message.success('移出成功')
  fetchData()
}

onMounted(fetchData)
</script>
