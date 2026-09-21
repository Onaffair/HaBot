<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in statsCards" :key="card.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" :style="{ backgroundColor: card.bgColor }">
              <el-icon :size="28"><component :is="card.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ card.value }}</div>
              <div class="stat-title">{{ card.title }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Headset, FolderOpened, CircleCloseFilled
} from '@element-plus/icons-vue'
import {
  groupListenApi, managedResourceApi, userBlacklistApi
} from '../api'

interface StatCard {
  title: string
  value: number
  icon: any
  bgColor: string
}

const statsCards = ref<StatCard[]>([
  { title: '监听群组', value: 0, icon: Headset, bgColor: '#409EFF' },
  { title: '目录资源', value: 0, icon: FolderOpened, bgColor: '#67C23A' },
  { title: '黑名单用户', value: 0, icon: CircleCloseFilled, bgColor: '#F56C6C' }
])

onMounted(async () => {
  try {
    const [groups, resources, blacklist] = await Promise.all([
      groupListenApi.list(),
      managedResourceApi.list(),
      userBlacklistApi.list()
    ])
    statsCards.value[0].value = groups.data?.length || 0
    statsCards.value[1].value = resources.data?.length || 0
    statsCards.value[2].value = blacklist.data?.length || 0
  } catch { /* ignore */ }
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}
.stat-card {
  margin-bottom: 20px;
}
.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.stat-title {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}
</style>
