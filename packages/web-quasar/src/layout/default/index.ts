import {defineComponent, h} from 'vue'
import {RouterView, RouterLink} from 'vue-router'
import {QBtn} from 'quasar'

export default defineComponent({
  name: 'default-layout',
  setup() {
    return () => {
      return (
        h('div', {}, [
          h('div', 'native'),
          h(QBtn, 'click'),
          h(RouterView),
        ])
      )
    }
  },
})
