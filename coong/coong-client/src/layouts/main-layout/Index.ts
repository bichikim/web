import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'
import {Footer, Header} from './components'
import {styled} from '@winter-love/uni'

export const HMainLayout = defineComponent({
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

export default styled(HMainLayout, {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
})
