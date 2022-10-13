import {styled} from '@winter-love/uni'
import {PianoButton} from './PianoButton'
import {EmptyPianoButton} from './EmptyPianoButton'
import {defineComponent, h} from 'vue'

export const HPianoSharp = defineComponent({
  setup() {
    return () =>
      h('div', [
        h(PianoButton, {pianoKey: '1c', type: 'sharp'}),
        h(PianoButton, {pianoKey: '1d', type: 'sharp'}),
        h(EmptyPianoButton, {pianoKey: '1e', type: 'sharp'}),
        h(PianoButton, {pianoKey: '1f', type: 'sharp'}),
        h(PianoButton, {pianoKey: '1g', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2a', type: 'sharp'}),
      ])
  },
})

export const PianoSharp = styled(HPianoSharp, {
  display: 'flex',
  gap: 20,
  height: 300,
  pl: 35,
  position: 'relative',
  width: '100%',
})
