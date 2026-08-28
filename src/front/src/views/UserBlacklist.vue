<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户黑名单管理</span>
          <el-button type="primary" @click="openDialog()">添加黑名单</el-button>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="qq" label="QQ号" width="180" />
        <el-table-column prop="reason" label="拉黑原因" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="添加时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openDialog(row)">编辑原因</el-button>
            <el-popconfirm title="确定移出黑名单吗？" @confirm="handleDelete(row.qq)">
              <template #reference>
                <el-button size="small" type="danger">移出</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑黑名单' : '添加黑名单'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="QQ号" required>
          <el-input v-model="form.qq" :disabled="isEdit" placeholder="请输入QQ号" />
        </el-form-item>
        <el-form-item label="拉黑原因">
          <el-input v-model="form.reason" type="textarea" placeholder="请输入拉黑原因（可选）" />
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
import { userBlacklistApi, UserBlacklist } from '../api'

const tableData = ref<UserBlacklist[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ qq: '', reason: '' })

const fetchData = async () => {
  loading.value = true
  try {
    const res = await userBlacklistApi.list()
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
    ElMessage.warning('请输入QQ号')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await userBlacklistApi.update(form.value.qq, { reason: form.value.reason })
      ElMessage.success('更新成功')
    } else {
      await userBlacklistApi.create({ qq: form.value.qq, reason: form.value.reason || undefined })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (qq: string) => {
  await userBlacklistApi.delete(qq)
  ElMessage.success('移出成功')
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { max-width: 1200px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
