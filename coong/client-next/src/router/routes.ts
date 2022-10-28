import {RouteRecordRaw} from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    children: [{component: () => import('pages/main/Page.vue'), path: ''}],
    component: () => import('layouts/MainLayout.vue'),
    path: '/',
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    component: () => import('pages/ErrorNotFound.vue'),
    path: '/:catchAll(.*)*',
  },
]

export default routes
