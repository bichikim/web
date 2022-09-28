import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'
import {Footer, Header, NavMenuType} from './components'

export const MainLayout = defineComponent({
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

    return () => (
      <div>
        <Header></Header>
        <RouterView></RouterView>
        <Footer></Footer>
      </div>
    )
  },
})

export default MainLayout
