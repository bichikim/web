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
  height: '100%',
  overflowY: 'hidden',
  pt: 0,
  px: 8,
})
