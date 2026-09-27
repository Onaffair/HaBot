import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '@/views/Layout.vue'

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
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '控制台' },
        },
        {
          path: 'group-listens',
          name: 'GroupListen',
          component: () => import('@/views/GroupListen.vue'),
          meta: { title: '监听群组' },
        },
        {
          path: 'managed-resources',
          name: 'ManagedResource',
          component: () => import('@/views/ManagedResource.vue'),
          meta: { title: '目录管理' },
        },
        {
          path: 'command-rules',
          name: 'CommandRule',
          component: () => import('@/views/CommandRule.vue'),
          meta: { title: '触发规则' },
        },
        {
          path: 'user-blacklist',
          name: 'UserBlacklist',
          component: () => import('@/views/UserBlacklist.vue'),
          meta: { title: '用户黑名单' },
        },
        {
          path: 'canvas',
          name: 'CanvasList',
          component: () => import('@/views/canvas/CanvasList.vue'),
          meta: { title: '流程画布' },
        },
        {
          path: 'canvas/:id',
          name: 'CanvasEditor',
          component: () => import('@/views/canvas/Canvas.vue'),
          meta: { title: '画布编辑' },
        },
        {
          path: 'system-configs',
          name: 'SystemConfig',
          component: () => import('@/views/SystemConfig.vue'),
          meta: { title: '系统配置' },
        },
      ],
    },
  ],
})

export default router
