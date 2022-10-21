import {defineComponent, h} from 'vue'
import {Piano} from './components'

export const Main = defineComponent({
  setup() {
    return () =>
      h('main', [
        //
        h(Piano),
      ])
  },
})

export default Main
