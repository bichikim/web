import {styled} from '@winter-love/uni'
import {defineComponent} from 'vue'
import {RouterView} from 'vue-router'
import {CFooter} from './components'

export const HMainLayout = defineComponent({
  components: {
    CFooter,
    RouterView,
  },
  name: 'MainLayout',
  template: `
    <div>
    <router-view></router-view>
    <c-footer/>
    </div>
  `,
})

export default styled(HMainLayout, {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
})
