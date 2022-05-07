import {RouteRecordRaw} from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    component: () => import('pages/test'),
    path: '/test',
  },
  {
    children: [
      {component: () => import('pages/main'), path: ''},
      {component: () => import('pages/main-sec'), path: 'sec'},
      {component: () => import('pages/string-template'), path: 'string-template'},
    ],
    component: () => import('layouts/DefaultLayout'),
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
