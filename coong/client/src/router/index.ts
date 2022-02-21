import {
  createRouter as _createRouter,
  createMemoryHistory,
  createWebHistory,
  RouteRecordRaw,
} from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    component: () => import('pages/Test'),
    path: '/test',
  },
  {
    children: [
      {
        component: () => import('pages/main'),
        path: '',
      },
      {
        component: () => import('pages/magic-auth-link'),
        path: 'magic-auth-link',
      },
      {
        component: () => import('pages/Babylon'),
        path: 'babylon',
      },
    ],
    component: () => import('pages/_layout'),
    path: '/',
  },
]

export const createRouter = () => {
  return _createRouter({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes,
  })
}
