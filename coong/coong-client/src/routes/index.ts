import {
  createRouter as _createRouter,
  createMemoryHistory,
  createWebHistory,
  RouteRecordRaw,
} from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('src/pages/main'),
        path: '',
      },
      {
        component: () => import('src/pages/test'),
        path: 'test',
      },
    ],
    component: () => import('src/layouts/main-layout/Index'),
    path: '/',
  },
]

export const createRouter = () => {
  return _createRouter({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes,
  })
}