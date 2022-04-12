import {RouteRecordRaw} from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    children: [
      {component: () => import('pages/main'), path: ''},
      {component: () => import('pages/string-template'), path: 'string-template'},
    ],
    component: () => import('pages/_layouts'),
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
