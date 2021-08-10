import {RouteRecordRaw} from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    children: [
      {component: () => import('pages/Main'), path: ''},
      {component: () => import('pages/Test'), path: 'test'},
      {component: () => import('pages/Test1'), path: 'test1'},
      {component: () => import('pages/Use'), path: 'use'},
    ],
    component: () => import('layouts/MainLayout'),
    path: '/',
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    component: () => import('pages/Error404.vue'),
    path: '/:catchAll(.*)*',
  },
]

export default routes
