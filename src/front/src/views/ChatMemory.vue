<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>对话记忆管理</span>
          <div class="header-actions">
            <el-input
              v-model="filterGroupId"
              placeholder="按群号筛选"
              clearable
              style="width: 180px; margin-right: 10px"
              @change="fetchData"
            />
            <el-input
              v-model="filterUserId"
              placeholder="按用户ID筛选"
              clearable
              style="width: 180px; margin-right: 10px"
              @change="fetchData"
            />
            <el-popconfirm title="确定清空所有数据吗？此操作不可恢复！" @confirm="handleClearAll">
              <template #reference>
                <el-button type="danger" plain>清空数据</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="groupId" label="群号" width="150" />
        <el-table-column prop="userId" label="用户ID" width="150" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'user' ? 'primary' : 'success'" size="small">
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" show-overflow-tooltip min-width="200" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-popconfirm title="确定删除该条记录吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @change="fetchData"
        style="margin-top: 16px; justify-content: flex-end"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { chatMemoryApi, ChatMemory } from '../api'

const tableData = ref<ChatMemory[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterGroupId = ref('')
const filterUserId = ref('')

const fetchData = async () => {
  loading.value = true
  try {
    const res = await chatMemoryApi.list({
      page: page.value,
      pageSize: pageSize.value,
      groupId: filterGroupId.value || undefined,
      userId: filterUserId.value || undefined
    })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  await chatMemoryApi.delete(id)
  ElMessage.success('删除成功')
  fetchData()
}

const handleClearAll = async () => {
  await chatMemoryApi.clearAll(filterGroupId.value || undefined)
  ElMessage.success('清空成功')
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { max-width: 1400px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.header-actions { display: flex; align-items: center; }
</style>
