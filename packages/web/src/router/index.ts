import {createRouter, createWebHistory, RouteRecordRaw} from 'vue-router'
import Default from '@/layout/default'
import Home from '@/views/Home'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'default-layout',
    children: [
      {
        path: '/',
        name: 'Home',
        component: Home,
      },
      {
        path: '/about',
        name: 'About',
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "about" */ '@/views/About'),
      },
      {
        path: '/board',
        name: 'Board',
        component: () => import(/* webpackChunkName: "board" */ '@/views/Board'),
      },
    ],
    component: Default,
  },
  /**
   * @see https://next.router.vuejs.org/guide/essentials/dynamic-matching.html#catch-all-404-not-found-route
   */
  {
    path: '/:pathMatch(.*)*',
    component: () => import(/* webpackChunkName: "error404" */ '@/views/Error404'),
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

export default router
