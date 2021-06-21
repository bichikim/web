import {defineComponent, h} from 'vue'

export const Main = defineComponent({
  name: 'Main',
  setup() {
    return () => (
      h('div', 'hello')
    )
  },
})

export default Main
