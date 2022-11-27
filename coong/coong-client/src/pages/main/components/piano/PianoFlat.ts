import {PianoButton} from 'src/pages/main/components/piano/PianoButton'
import {defineComponent, h} from 'vue'
import {styled} from '@winter-love/uni'

export const HPianoFlat = defineComponent({
  name: 'PianoFlat',
  setup() {
    return () =>
      h('div', [
        h(PianoButton, {keyName: 'A', pianoKey: '-1a'}),
        h(PianoButton, {keyName: 'B', pianoKey: '-1b'}),
        h(PianoButton, {keyName: 'C', pianoKey: '-1c'}),
        h(PianoButton, {keyName: 'D', pianoKey: '-1d'}),
        h(PianoButton, {keyName: 'E', pianoKey: '-1e'}),
        h(PianoButton, {keyName: 'F', pianoKey: '-1f'}),
        h(PianoButton, {keyName: 'G', pianoKey: '-1g'}),
        //
        h(PianoButton, {keyName: 'A', pianoKey: '0a'}),
        h(PianoButton, {keyName: 'B', pianoKey: '0b'}),
        h(PianoButton, {keyName: 'C', pianoKey: '0c'}),
        h(PianoButton, {keyName: 'D', pianoKey: '0d'}),
        h(PianoButton, {keyName: 'E', pianoKey: '0e'}),
        h(PianoButton, {keyName: 'F', pianoKey: '0f'}),
        h(PianoButton, {keyName: 'G', pianoKey: '0g'}),
        //
        h(PianoButton, {keyName: 'A', pianoKey: '1a'}),
        h(PianoButton, {keyName: 'B', pianoKey: '1b'}),
        h(PianoButton, {keyName: 'C', pianoKey: '1c'}),
        h(PianoButton, {keyName: 'D', pianoKey: '1d'}),
        h(PianoButton, {keyName: 'E', pianoKey: '1e'}),
        h(PianoButton, {keyName: 'F', pianoKey: '1f'}),
        h(PianoButton, {keyName: 'G', pianoKey: '1g'}),
        //
        h(PianoButton, {keyName: 'A', pianoKey: '2a'}),
        h(PianoButton, {keyName: 'B', pianoKey: '2b'}),
        h(PianoButton, {keyName: 'C', pianoKey: '2c'}),
        h(PianoButton, {keyName: 'D', pianoKey: '2d'}),
        h(PianoButton, {keyName: 'E', pianoKey: '2e'}),
        h(PianoButton, {keyName: 'F', pianoKey: '2f'}),
        h(PianoButton, {keyName: 'G', pianoKey: '2g'}),
        //
        h(PianoButton, {keyName: 'A', pianoKey: '3a'}),
        h(PianoButton, {keyName: 'B', pianoKey: '3b'}),
        h(PianoButton, {keyName: 'C', pianoKey: '3c'}),
        h(PianoButton, {keyName: 'D', pianoKey: '3d'}),
        h(PianoButton, {keyName: 'E', pianoKey: '3e'}),
        h(PianoButton, {keyName: 'F', pianoKey: '3f'}),
        h(PianoButton, {keyName: 'G', pianoKey: '3g'}),
        //
        h(PianoButton, {keyName: 'A', pianoKey: '4a'}),
        h(PianoButton, {keyName: 'B', pianoKey: '4b'}),
        h(PianoButton, {keyName: 'C', pianoKey: '4c'}),
        h(PianoButton, {keyName: 'D', pianoKey: '4d'}),
        h(PianoButton, {keyName: 'E', pianoKey: '4e'}),
        h(PianoButton, {keyName: 'F', pianoKey: '4f'}),
        h(PianoButton, {keyName: 'G', pianoKey: '4g'}),
        //
        h(PianoButton, {keyName: 'A', pianoKey: '5a'}),
        h(PianoButton, {keyName: 'B', pianoKey: '5b'}),
        h(PianoButton, {keyName: 'C', pianoKey: '5c'}),
        h(PianoButton, {keyName: 'D', pianoKey: '5d'}),
        h(PianoButton, {keyName: 'E', pianoKey: '5e'}),
        h(PianoButton, {keyName: 'F', pianoKey: '5f'}),
        h(PianoButton, {keyName: 'G', pianoKey: '5g'}),
        h(PianoButton, {keyName: 'A', pianoKey: '6a'}),
        h(PianoButton, {keyName: 'B', pianoKey: '6b'}),
        h(PianoButton, {keyName: 'C', pianoKey: '6c'}),
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
