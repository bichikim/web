import {defineComponent, h} from 'vue'
import {systems, systemProps} from '../system'

export const Box = defineComponent({
  name: 'Box',
  props: {
    ...systemProps,
  },
  setup() {
    return () => (
      h('div')
    )
  },
})
