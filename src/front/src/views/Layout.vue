<template>
  <a-layout class="min-h-screen">
    <!-- 侧边栏 -->
    <a-layout-sider :width="220" theme="dark" class="!bg-[#001529]">
      <div class="flex h-[60px] items-center justify-center border-b border-white/10 text-white">
        <h2 class="text-base font-semibold">HaBot 管理后台</h2>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        @click="onMenuClick"
      >
        <a-menu-item key="/dashboard">
          <template #icon><HomeOutlined /></template>
          <span>控制台</span>
        </a-menu-item>
        <a-menu-item key="/group-listens">
          <template #icon><TeamOutlined /></template>
          <span>监听群组</span>
        </a-menu-item>
        <a-menu-item key="/managed-resources">
          <template #icon><FolderOpenOutlined /></template>
          <span>目录管理</span>
        </a-menu-item>
        <a-menu-item key="/command-rules">
          <template #icon><ControlOutlined /></template>
          <span>触发规则</span>
        </a-menu-item>
        <a-menu-item key="/user-blacklist">
          <template #icon><UserDeleteOutlined /></template>
          <span>用户黑名单</span>
        </a-menu-item>
        <a-menu-item key="/canvas">
          <template #icon><PartitionOutlined /></template> 
          <span>流程画布</span>
        </a-menu-item>
        <a-menu-item key="/system-configs">
          <template #icon><SettingOutlined /></template>
          <span>系统配置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout>
      <a-layout-header class="!h-[60px] !bg-white !px-6 !leading-[60px] shadow-sm">
        <h3 class="m-0 text-base font-medium">{{ currentTitle }}</h3>
      </a-layout-header>
      <a-layout-content class="bg-[#f5f5f5] p-4 overflow-auto">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  HomeOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  ControlOutlined,
  UserDeleteOutlined,
  PartitionOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()

const selectedKeys = ref<string[]>([route.path])
const currentTitle = computed(() => (route.meta?.title as string) || '控制台')

// 路由变化时同步菜单高亮（浏览器前进/后退等）
watch(
  () => route.path,
  (p) => (selectedKeys.value = [p]),
)

const onMenuClick = ({ key }: { key: string }) => {
  if (key !== route.path) router.push(key)
}
</script>
