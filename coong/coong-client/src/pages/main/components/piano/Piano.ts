import {defineComponent, h} from 'vue'
import {HPianoFlat} from './PianoFlat'
import {HPianoSharp} from './PianoSharp'

export const HPiano = defineComponent({
  name: 'Piano',
  setup: () => {
    return () =>
      h('section', {class: 'h-full max-h-466px pb-30px pointer-events-none relative'}, [
        //
        h(HPianoFlat, {class: 'flat'}),
        h(HPianoSharp, {class: 'sharp absolute top-0'}),
      ])
  },
})
