import {RouteRecordRaw} from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    children: [{component: () => import('pages/main'), path: ''}],
    component: () => import('pages/_layouts/MainLayout.vue'),
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
