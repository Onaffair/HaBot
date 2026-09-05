<template>
  <el-container style="height: 100vh">
    <!-- 侧边栏 -->
    <el-aside width="220px" style="background-color: #304156">
      <div class="logo">
        <h2>HaBot 管理后台</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        <el-menu-item index="/group-listens">
          <el-icon><Headset /></el-icon>
          <span>监听群组</span>
        </el-menu-item>
        <el-menu-item index="/managed-resources">
          <el-icon><FolderAdd /></el-icon>
          <span>目录管理</span>
        </el-menu-item>
        <el-menu-item index="/command-rules">
          <el-icon><SetUp /></el-icon>
          <span>触发规则</span>
        </el-menu-item>
        <el-menu-item index="/chat-memories">
          <el-icon><ChatDotSquare /></el-icon>
          <span>对话记忆</span>
        </el-menu-item>
        <el-menu-item index="/memory-summaries">
          <el-icon><Document /></el-icon>
          <span>对话摘要</span>
        </el-menu-item>
        <el-menu-item index="/user-blacklist">
          <el-icon><CircleCloseFilled /></el-icon>
          <span>用户黑名单</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <el-header style="border-bottom: 1px solid #e6e6e6; display: flex; align-items: center">
        <h3>{{ currentTitle }}</h3>
      </el-header>
      <el-main style="background: #f0f2f5">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  HomeFilled, Headset, FolderAdd, SetUp,
  ChatDotSquare, Document, CircleCloseFilled
} from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title as string || '控制台')
</script>

<style scoped>
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.logo h2 {
  font-size: 16px;
  font-weight: 600;
}
.el-aside {
  overflow: hidden;
}
.el-menu {
  border-right: none;
}
.el-main {
  overflow-y: auto;
}
</style>
