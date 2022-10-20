import {defineComponent, h} from 'vue'
import {styled} from '@winter-love/uni'
import {typeVariants} from './type-variants'

export const HEmptyPianoButton = defineComponent({
  name: 'HEmptyPianoButton',
  setup() {
    return () => h('div')
  },
})

export const EmptyPianoButton = styled(
  HEmptyPianoButton,
  {
    display: 'inline-block',
    height: '100%',
    pointerEvents: 'none',
  },
  typeVariants,
)
