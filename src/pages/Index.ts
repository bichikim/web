import {defineComponent, h} from 'vue'

export const IndexPage = defineComponent({
  name: 'IndexPage',
  setup() {
    return () => (
      h('div', 'hello')
    )
  },
})
