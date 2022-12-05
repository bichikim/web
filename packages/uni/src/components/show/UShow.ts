import {styled} from 'src/style'
import {defineComponent, h} from 'vue'

export const HShow = defineComponent({
  props: {
    as: {default: 'div'},
  },
  setup: (props, {slots}) => {
    return () => h(props.as, slots.default?.())
  },
})

export const UShow = styled(HShow, {
  defaultVariants: {
    when: false,
  },
  variants: {
    when: {
      false: {
        display: 'none',
      },
    },
  },
})
