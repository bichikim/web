import {defineComponent, h} from 'vue'
import {Piano} from './components'

export const Main = defineComponent({
  name: 'MainPage',
  setup() {
    return () =>
      h('main', [
        //
        h(Piano),
      ])
  },
})

export default Main
