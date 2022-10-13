import {defineComponent, h} from 'vue'
import {PianoButton} from './PianoButton'
import {styled} from '@winter-love/uni'
import {PianoFlat} from './PianoFlat'
import {PianoSharp} from './PianoSharp'

export const HPiano = defineComponent({
  setup: () => {
    return () =>
      h('div', [
        //
        h(PianoFlat, {class: 'flat'}),
        h(PianoSharp, {class: 'sharp'}),
      ])
  },
})

export const Piano = styled(HPiano, {
  '& .sharp': {
    position: 'absolute',
    top: 0,
  },
  height: '500px',
  position: 'relative',
  width: '100%',
})
