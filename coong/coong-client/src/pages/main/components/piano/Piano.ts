import {defineComponent, h, computed} from 'vue'
import {HPianoFlat} from './PianoFlat'
import {HPianoSharp} from './PianoSharp'

export const HPiano = defineComponent({
  name: 'Piano',
  props: {
    scale: {type: Number, default: 100},
  },
  setup: (props) => {
    const style = computed(() => {
      const _scale = props.scale
      return {transform: `scale(${_scale / 100})`}
    })
    return () =>
      h(
        'section',
        {
          class:
            'h-full max-h-466px pb-30px pointer-events-none relative origin-top-left',
          style: style.value,
        },
        [
          //
          h(HPianoFlat, {class: 'flat'}),
          h(HPianoSharp, {class: 'sharp absolute top-0'}),
        ],
      )
  },
})
