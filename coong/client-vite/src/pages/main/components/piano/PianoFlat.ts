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
        h(PianoButton, {pianoKey: '2b'}),
        h(PianoButton, {pianoKey: '2c'}),
        h(PianoButton, {pianoKey: '2d'}),
        h(PianoButton, {pianoKey: '2e'}),
        h(PianoButton, {pianoKey: '2f'}),
        h(PianoButton, {pianoKey: '2g'}),
        h(PianoButton, {pianoKey: '3a'}),
        h(PianoButton, {pianoKey: '3b'}),
      ])
  },
})

export const PianoFlat = styled(HPianoFlat, {
  height: 500,
  position: 'relative',
  whiteSpace: 'nowrap',
  width: '100%',
})
