import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'
import {Footer, Header} from './components'

export const MainLayout = defineComponent({
  name: 'MainLayout',
  setup: () => {
    return () =>
      h('div', [
        //
        h(RouterView),
        h(Footer),
      ])
  },
})

export default MainLayout
