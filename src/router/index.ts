import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/__admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue')
    },
    // --- 修改这里：使用动态引入 ---
    {
      path: '/chat',
      name: 'chat',
      // 这样写就不需要在顶部 import OpenClawChat 了
      // 并且只有访问 /chat 时才会加载这个文件的代码
      component: () => import('../views/OpenClawChat.vue')
    }
  ]
})

export default router