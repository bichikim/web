import {
  createRouter as _createRouter,
  createMemoryHistory,
  createWebHistory,
  RouteRecordRaw,
} from 'vue-router'

const routes: RouteRecordRaw[] = [{
  children: [
    {
      component: () => import('pages/index'),
      path: '',
    },
    {
      component: () => import('pages/Sec.vue'),
      path: 'sec',
    },
    {
      component: () => import('pages/Pure'),
      path: 'pure',
    },
    {
      component: () => import('pages/Graphql'),
      path: 'graphql',
    },
    {
      component: () => import('pages/Babylon'),
      path: 'babylon',
    },
  ],
  component: () => import('pages/_layout'),
  path: '/',
}]

export const createRouter = () => {
  return _createRouter({
    history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
    routes,
  })
}
