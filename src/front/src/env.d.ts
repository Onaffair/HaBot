/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 允许在 .vue <script setup lang="tsx"> 与 .tsx 文件中直接使用 JSX
declare module 'vue/jsx-runtime'
