<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>对话摘要管理</span>
          <div class="header-actions">
            <el-input
              v-model="filterGroupId"
              placeholder="按群号筛选"
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
        <el-table-column prop="sinceId" label="起始记忆ID" width="120" />
        <el-table-column prop="summary" label="摘要内容" show-overflow-tooltip min-width="300" />
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
import { memorySummaryApi, MemorySummary } from '../api'

const tableData = ref<MemorySummary[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterGroupId = ref('')

const fetchData = async () => {
  loading.value = true
  try {
    const res = await memorySummaryApi.list({
      page: page.value,
      pageSize: pageSize.value,
      groupId: filterGroupId.value || undefined
    })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  await memorySummaryApi.delete(id)
  ElMessage.success('删除成功')
  fetchData()
}

const handleClearAll = async () => {
  await memorySummaryApi.clearAll(filterGroupId.value || undefined)
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
