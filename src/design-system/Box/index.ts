import {defineComponent, h} from 'vue'
import {Container, containerProps} from './Container'

export const Box = defineComponent({
  name: 'Box',
  props: {
    ...containerProps,
  },
  setup(props, {attrs, slots}) {
    return () => (
      h(Container, {...attrs, ...props}, slots)
    )
  },
})
