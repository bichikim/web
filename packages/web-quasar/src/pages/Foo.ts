import {defineComponent, h} from 'vue'

export const Foo = defineComponent({
  name: 'Foo',
  setup: () => {
    return () => (
      h('span', 'hi')
    )
  },
})
