<template>
  <router-view />
</template>

<script setup lang="ts"></script>

<style lang="less">
/* 全局样式统一由 src/styles/tailwind.css 提供，此处仅保留 SFC 挂载点 */
@import '@/styles/variables.less';

#app {
  height: 100%;
  /* 演示 Less 变量已可用：左侧一条品牌主色描边 */
  border-left: 2px solid transparent;
}
</style>
