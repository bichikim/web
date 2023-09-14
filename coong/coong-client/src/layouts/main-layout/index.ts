import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'
import {CFooter} from './components'

export const MainLayout = defineComponent({
  components: {
    CFooter,
    RouterView,
  },
  name: 'MainLayout',
  template: `
    <div class="flex flex-col h-full">
    <router-view></router-view>
    <c-footer/>
    </div>
  `,
})

export default MainLayout
