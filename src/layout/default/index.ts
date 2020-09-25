import {defineComponent, h} from 'vue'
import {RouterView, RouterLink} from 'vue-router'

export default defineComponent({
  name: 'default-layout',
  setup() {
    return () => {
      return (
        h('div', {}, [
          h(RouterLink, {to: {name: 'Home'}}, () => 'home'),
          h(RouterLink, {to: 'About'}, () => 'about'),
          h(RouterLink, {to: 'Board'}, () => 'board'),
          h(RouterView),
        ])
      )
    }
  },
})
