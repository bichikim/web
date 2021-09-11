import {
  createRouter as _createRouter,
  createMemoryHistory,
  createWebHistory,
  RouteRecordRaw,
} from 'vue-router'

const routes: RouteRecordRaw[] = [{
  children: [
    {
      component: () => import('pages/Index'),
      path: '',
    },
  ],
  component: () => import('layouts/PagesLayout'),
  path: '/',
}]

export const createRouter = () => {
  return _createRouter({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes,
  })
}
