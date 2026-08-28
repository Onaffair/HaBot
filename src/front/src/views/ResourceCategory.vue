<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>资源分类管理</span>
          <el-button type="primary" @click="openDialog()">添加分类</el-button>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="path" label="路径" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该分类吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分类' : '添加分类'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="分类名称" required>
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="路径" required>
          <el-input v-model="form.path" placeholder="请输入资源路径" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" placeholder="请输入描述（可选）" />
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
import { resourceCategoryApi, ResourceCategory } from '../api'

const tableData = ref<ResourceCategory[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const editingId = ref(0)
const form = ref({ name: '', path: '', description: '' })

const fetchData = async () => {
  loading.value = true
  try {
    const res = await resourceCategoryApi.list()
    tableData.value = res.data || []
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: ResourceCategory) => {
  if (row) {
    isEdit.value = true
    editingId.value = row.id
    form.value = { name: row.name, path: row.path, description: row.description || '' }
  } else {
    isEdit.value = false
    editingId.value = 0
    form.value = { name: '', path: '', description: '' }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.name.trim() || !form.value.path.trim()) {
    ElMessage.warning('名称和路径不能为空')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await resourceCategoryApi.update(editingId.value, {
        name: form.value.name,
        path: form.value.path,
        description: form.value.description || undefined
      })
      ElMessage.success('更新成功')
    } else {
      await resourceCategoryApi.create({
        name: form.value.name,
        path: form.value.path,
        description: form.value.description || undefined
      })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  await resourceCategoryApi.delete(id)
  ElMessage.success('删除成功')
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { max-width: 1200px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
