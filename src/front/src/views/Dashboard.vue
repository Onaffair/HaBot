<template>
  <div class="page-container">
    <!-- Bot 生命周期控制 -->
    <a-card :bordered="false" class="mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span
            class="inline-block h-3 w-3 rounded-full"
            :class="botRunning ? 'bg-green-500' : 'bg-gray-400'"
          />
          <span class="text-base font-medium">
            Bot {{ botRunning ? '运行中' : '已停止' }}
          </span>
          <!-- 连接类配置已保存但当前连接仍在用旧参数 -->
          <a-tag v-if="configStale" color="orange">配置已更新，重启生效</a-tag>
        </div>
        <a-space>
          <a-button
            v-if="!botRunning"
            type="primary"
            :loading="botLoading"
            @click="handleBotStart"
          >
            启动
          </a-button>
          <template v-else>
            <a-button :loading="botLoading" @click="handleBotRestart">重启</a-button>
            <a-button danger :loading="botLoading" @click="handleBotStop">停止</a-button>
          </template>
        </a-space>
      </div>
    </a-card>

    <a-row :gutter="16">
      <a-col :span="6" v-for="card in statsCards" :key="card.title">
        <a-card :bordered="false" hoverable>
          <div class="flex items-center gap-4">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-xl text-white text-2xl"
              :style="{ backgroundColor: card.color }"
            >
              <component :is="card.icon" />
            </div>
            <div>
              <div class="text-[28px] font-bold leading-tight text-gray-800">{{ card.value }}</div>
              <div class="mt-1 text-sm text-gray-500">{{ card.title }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { TeamOutlined, FolderOpenOutlined, UserDeleteOutlined } from '@ant-design/icons-vue'
import { GroupListenApi, ManagedResourceApi, UserBlacklistApi, BotControlApi } from '@/api'

interface StatCard {
  title: string
  value: number
  icon: any
  color: string
}

const statsCards = ref<StatCard[]>([
  { title: '监听群组', value: 0, icon: TeamOutlined, color: '#1677ff' },
  { title: '目录资源', value: 0, icon: FolderOpenOutlined, color: '#52c41a' },
  { title: '黑名单用户', value: 0, icon: UserDeleteOutlined, color: '#ff4d4f' },
])

const botRunning = ref(false)
const botLoading = ref(false)
/** 系统配置页改过连接参数但尚未重启生效 */
const configStale = ref(false)

async function refreshBotStatus() {
  try {
    const res = await BotControlApi.status()
    botRunning.value = res.data?.running ?? false
    configStale.value = res.data?.configStale ?? false
  } catch { /* 拦截器已弹错 */ }
}

async function handleBotStart() {
  botLoading.value = true
  try {
    const res = await BotControlApi.start()
    if (res.success) {
      message.success('Bot 已启动')
      botRunning.value = true
      configStale.value = res.data?.configStale ?? false
    } else {
      message.warning(res.message || '启动失败')
    }
  } catch { /* 拦截器处理 */ } finally {
    botLoading.value = false
  }
}

async function handleBotStop() {
  botLoading.value = true
  try {
    const res = await BotControlApi.stop()
    if (res.success) {
      message.success('Bot 已停止')
      botRunning.value = false
    } else {
      message.warning(res.message || '停止失败')
    }
  } catch { /* 拦截器处理 */ } finally {
    botLoading.value = false
  }
}

/** 以最新系统配置重建连接（配置页改动连接参数后可手动触发） */
async function handleBotRestart() {
  botLoading.value = true
  try {
    const res = await BotControlApi.restart()
    if (res.success) {
      message.success('Bot 已重启')
      botRunning.value = true
      configStale.value = res.data?.configStale ?? false
    } else {
      message.warning(res.message || '重启失败')
    }
  } catch { /* 拦截器处理 */ } finally {
    botLoading.value = false
  }
}

onMounted(async () => {
  refreshBotStatus()
  try {
    const [groups, resources, blacklist] = await Promise.all([
      GroupListenApi.list(),
      ManagedResourceApi.list(),
      UserBlacklistApi.list(),
    ])
    statsCards.value[0].value = groups.data?.length || 0
    statsCards.value[1].value = resources.data?.length || 0
    statsCards.value[2].value = blacklist.data?.length || 0
  } catch {
    /* 拦截器已弹错，此处忽略 */
  }
})
</script>
