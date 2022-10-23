import {defineComponent, h} from 'vue'
import {Piano} from './components'
import {styled} from '@winter-love/uni'

export const HMainPage = defineComponent({
  name: 'HMainPage',
  setup() {
    return () =>
      h('main', [
        //
        h(Piano),
      ])
  },
})

export const MainPage = styled(HMainPage, {
  pb: 10,
})
