import {defineComponent, h} from 'vue'
import {styled} from '@winter-love/uni'

export const HEmptyPianoButton = defineComponent({
  name: 'HEmptyPianoButton',
  setup() {
    return () => h('div')
  },
})

export const EmptyPianoButton = styled(
  HEmptyPianoButton,
  {
    height: '100%',
    pointerEvents: 'none',
    width: 50,
  },
  {
    variants: {
      type: {
        flat: {
          width: '50px',
        },
        sharp: {
          width: '30px',
        },
      },
    },
  },
)
