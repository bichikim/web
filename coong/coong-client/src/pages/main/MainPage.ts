import {defineComponent, h} from 'vue'
import {HPiano} from './components'

export const MainPage = defineComponent({
  name: 'HMainPage',
  setup() {
    return () =>
      h('main', {class: 'h-full overflow-y-hidden pt-0 px-2 flex'}, [
        //
        h(HPiano),
      ])
  },
})
