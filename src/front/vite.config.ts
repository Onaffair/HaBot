import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'node:path'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    // 启用 Less 预处理器：SFC 中 <style lang="less"> 与 .less 文件均可直接使用
    preprocessorOptions: {
      less: {
        // 允许在 Less 中使用 JS 表达式（antd 主题定制等场景需要）
        javascriptEnabled: true,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
})
