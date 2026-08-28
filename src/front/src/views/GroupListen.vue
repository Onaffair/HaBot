<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>监听群组管理</span>
          <el-button type="primary" @click="openDialog()">添加群组</el-button>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="groupId" label="群号" />
        <el-table-column prop="enabled" label="启用状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'danger'" size="small">
              {{ row.enabled ? '已启用' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该群组吗？" @confirm="handleDelete(row.groupId)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑群组' : '添加群组'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="群号" required>
          <el-input v-model="form.groupId" :disabled="isEdit" placeholder="请输入群号" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { groupListenApi, GroupListen } from '../api'

const tableData = ref<GroupListen[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ groupId: '', enabled: true })

const fetchData = async () => {
  loading.value = true
  try {
    const res = await groupListenApi.list()
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
    ElMessage.warning('请输入群号')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await groupListenApi.update(form.value.groupId, { enabled: form.value.enabled })
      ElMessage.success('更新成功')
    } else {
      await groupListenApi.create({ groupId: form.value.groupId, enabled: form.value.enabled })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (groupId: string) => {
  await groupListenApi.delete(groupId)
  ElMessage.success('删除成功')
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { max-width: 1200px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
