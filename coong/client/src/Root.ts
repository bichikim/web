import {defineComponent, h} from 'vue'
import {RouterView} from 'vue-router'

const Root = defineComponent({
  setup() {
    return () => {
      return (
        h('div', [
          h(RouterView),
        ])
      )
    }
  },
})

export default Root
