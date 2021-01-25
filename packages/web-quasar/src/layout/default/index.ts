import {defineComponent, h} from 'vue'
import {RouterView, RouterLink} from 'vue-router'

export default defineComponent({
  name: 'default-layout',
  setup() {
    return () => {
      return (
        h('div', {}, () => [
          h('div', 'native'),
          h(RouterView),
        ])
      )
    }
  },
})
