import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '../views/Layout.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue'),
          meta: { title: '控制台' }
        },
        {
          path: 'group-listens',
          name: 'GroupListen',
          component: () => import('../views/GroupListen.vue'),
          meta: { title: '监听群组' }
        },
        {
          path: 'resource-categories',
          name: 'ResourceCategory',
          component: () => import('../views/ResourceCategory.vue'),
          meta: { title: '资源分类' }
        },
        {
          path: 'chat-memories',
          name: 'ChatMemory',
          component: () => import('../views/ChatMemory.vue'),
          meta: { title: '对话记忆' }
        },
        {
          path: 'memory-summaries',
          name: 'MemorySummary',
          component: () => import('../views/MemorySummary.vue'),
          meta: { title: '对话摘要' }
        },
        {
          path: 'user-blacklist',
          name: 'UserBlacklist',
          component: () => import('../views/UserBlacklist.vue'),
          meta: { title: '用户黑名单' }
        }
      ]
    }
  ]
})

export default router
