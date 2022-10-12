import {defineComponent, h} from 'vue'
import {styled} from '@winter-love/uni'

export const HPianoButton = defineComponent({
  props: {},
  setup: () => {
    return () => h('button')
  },
})

export const PianoButton = styled(HPianoButton, {
  backgroundColor: 'red',
  height: '500px',
  width: '50px',
})
