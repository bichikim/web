import {HPianoButton} from './PianoButton'
import {defineComponent, h} from 'vue'

export const HPianoFlat = defineComponent({
  name: 'PianoFlat',
  setup() {
    return () =>
      h('div', {class: 'h-full pointer-events-none relative whitespace-nowrap w-full'}, [
        h(HPianoButton, {keyName: 'A', pianoKey: '-1a'}),
        h(HPianoButton, {keyName: 'B', pianoKey: '-1b'}),
        h(HPianoButton, {keyName: 'C', pianoKey: '-1c'}),
        h(HPianoButton, {keyName: 'D', pianoKey: '-1d'}),
        h(HPianoButton, {keyName: 'E', pianoKey: '-1e'}),
        h(HPianoButton, {keyName: 'F', pianoKey: '-1f'}),
        h(HPianoButton, {keyName: 'G', pianoKey: '-1g'}),
        //
        h(HPianoButton, {keyName: 'A', pianoKey: '0a'}),
        h(HPianoButton, {keyName: 'B', pianoKey: '0b'}),
        h(HPianoButton, {keyName: 'C', pianoKey: '0c'}),
        h(HPianoButton, {keyName: 'D', pianoKey: '0d'}),
        h(HPianoButton, {keyName: 'E', pianoKey: '0e'}),
        h(HPianoButton, {keyName: 'F', pianoKey: '0f'}),
        h(HPianoButton, {keyName: 'G', pianoKey: '0g'}),
        //
        h(HPianoButton, {keyName: 'A', pianoKey: '1a'}),
        h(HPianoButton, {keyName: 'B', pianoKey: '1b'}),
        h(HPianoButton, {keyName: 'C', pianoKey: '1c'}),
        h(HPianoButton, {keyName: 'D', pianoKey: '1d'}),
        h(HPianoButton, {keyName: 'E', pianoKey: '1e'}),
        h(HPianoButton, {keyName: 'F', pianoKey: '1f'}),
        h(HPianoButton, {keyName: 'G', pianoKey: '1g'}),
        //
        h(HPianoButton, {keyName: 'A', pianoKey: '2a'}),
        h(HPianoButton, {keyName: 'B', pianoKey: '2b'}),
        h(HPianoButton, {keyName: 'C', pianoKey: '2c'}),
        h(HPianoButton, {keyName: 'D', pianoKey: '2d'}),
        h(HPianoButton, {keyName: 'E', pianoKey: '2e'}),
        h(HPianoButton, {keyName: 'F', pianoKey: '2f'}),
        h(HPianoButton, {keyName: 'G', pianoKey: '2g'}),
        //
        h(HPianoButton, {keyName: 'A', pianoKey: '3a'}),
        h(HPianoButton, {keyName: 'B', pianoKey: '3b'}),
        h(HPianoButton, {keyName: 'C', pianoKey: '3c'}),
        h(HPianoButton, {keyName: 'D', pianoKey: '3d'}),
        h(HPianoButton, {keyName: 'E', pianoKey: '3e'}),
        h(HPianoButton, {keyName: 'F', pianoKey: '3f'}),
        h(HPianoButton, {keyName: 'G', pianoKey: '3g'}),
        //
        h(HPianoButton, {keyName: 'A', pianoKey: '4a'}),
        h(HPianoButton, {keyName: 'B', pianoKey: '4b'}),
        h(HPianoButton, {keyName: 'C', pianoKey: '4c'}),
        h(HPianoButton, {keyName: 'D', pianoKey: '4d'}),
        h(HPianoButton, {keyName: 'E', pianoKey: '4e'}),
        h(HPianoButton, {keyName: 'F', pianoKey: '4f'}),
        h(HPianoButton, {keyName: 'G', pianoKey: '4g'}),
        //
        h(HPianoButton, {keyName: 'A', pianoKey: '5a'}),
        h(HPianoButton, {keyName: 'B', pianoKey: '5b'}),
        h(HPianoButton, {keyName: 'C', pianoKey: '5c'}),
        h(HPianoButton, {keyName: 'D', pianoKey: '5d'}),
        h(HPianoButton, {keyName: 'E', pianoKey: '5e'}),
        h(HPianoButton, {keyName: 'F', pianoKey: '5f'}),
        h(HPianoButton, {keyName: 'G', pianoKey: '5g'}),
        h(HPianoButton, {keyName: 'A', pianoKey: '6a'}),
        h(HPianoButton, {keyName: 'B', pianoKey: '6b'}),
        h(HPianoButton, {keyName: 'C', pianoKey: '6c'}),
      ])
  },
})

// export const PianoFlat = styled(HPianoFlat, {
//   '&>button': {
//     background: 'linear-gradient(-30deg,#f5f5f5,#fff)',
//   },
//   height: '100%',
//   pointerEvents: 'none',
//   position: 'relative',
//   whiteSpace: 'nowrap',
//   width: '100%',
// })
