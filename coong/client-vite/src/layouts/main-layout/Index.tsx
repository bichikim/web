import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'
import {Footer, Header, NavMenuType} from './components'

export const MainLayout = defineComponent({
  components: {
    Footer,
    Header,
    RouterView,
  },
  name: 'MainLayout',
  setup: () => {
    const navList: NavMenuType[] = [
      {
        text: 'wallet',
      },
      {
        children: [
          {
            text: 'submenu 1',
          },
          {
            text: 'submenu 2',
          },
        ],
        text: 'support',
      },
      {
        text: 'Login now',
      },
    ]

    return {
      navList,
    }
  },
  template: `
    <div class="px-8 prose pb-8 pt-2">
      <Header class="sticky top-0 z-50" :nav-list="navList" />
      <RouterView />
      <Footer />
    </div>
  `,
})

export default MainLayout
