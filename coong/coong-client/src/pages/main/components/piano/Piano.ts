import {defineComponent, h} from 'vue'
import {styled} from '@winter-love/uni'
import {PianoFlat} from './PianoFlat'
import {PianoSharp} from './PianoSharp'

export const HPiano = defineComponent({
  name: 'Piano',
  setup: () => {
    return () =>
      h('section', [
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
  height: '100%',
  position: 'relative',
  width: '100%',
})