import {PianoButton} from 'src/pages/main/components/piano/PianoButton'
import {defineComponent, h} from 'vue'
import {styled} from '@winter-love/uni'

export const HPianoFlat = defineComponent({
  setup() {
    return () =>
      h('div', [
        h(PianoButton, {pianoKey: '1c'}),
        h(PianoButton, {pianoKey: '1d'}),
        h(PianoButton, {pianoKey: '1e'}),
        h(PianoButton, {pianoKey: '1f'}),
        h(PianoButton, {pianoKey: '1g'}),
        h(PianoButton, {pianoKey: '2a'}),
      ])
  },
})

export const PianoFlat = styled(HPianoFlat, {
  height: 500,
  position: 'relative',
  width: '100%',
})
