import {defineComponent, h} from 'vue'

export const IndexPage = defineComponent({
  name: 'Main',
  setup() {
    return () => (
      h('div', 'hello')
    )
  },
})
