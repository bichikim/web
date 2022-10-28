import {PianoButton} from 'src/pages/main/components/piano/PianoButton'
import {defineComponent, h} from 'vue'
import {styled} from '@winter-love/uni'

export const HPianoFlat = defineComponent({
  name: 'PianoFlat',
  setup() {
    return () =>
      h('div', [
        h(PianoButton, {pianoKey: '0f'}),
        h(PianoButton, {pianoKey: '0g'}),
        h(PianoButton, {pianoKey: '1a'}),
        h(PianoButton, {pianoKey: '1b'}),
        //
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
        h(PianoButton, {pianoKey: '3c'}),
        h(PianoButton, {pianoKey: '3d'}),
        h(PianoButton, {pianoKey: '3e'}),
        h(PianoButton, {pianoKey: '3f'}),
        h(PianoButton, {pianoKey: '3g'}),
        h(PianoButton, {pianoKey: '4a'}),
        h(PianoButton, {pianoKey: '4b'}),
      ])
  },
})

export const PianoFlat = styled(HPianoFlat, {
  '&>button': {
    background: 'linear-gradient(-30deg,#f5f5f5,#fff)',
  },
  height: '100%',
  position: 'relative',
  whiteSpace: 'nowrap',
  width: '100%',
})
