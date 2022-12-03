import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'

export const MainLayout = defineComponent({
  setup: () => {
    return () => h(RouterView)
  },
})

export default MainLayout
