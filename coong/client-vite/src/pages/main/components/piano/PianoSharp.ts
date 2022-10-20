import {styled} from '@winter-love/uni'
import {PianoButton} from './PianoButton'
import {EmptyPianoButton} from './EmptyPianoButton'
import {defineComponent, h} from 'vue'

export const HPianoSharp = defineComponent({
  setup() {
    return () =>
      h('div', [
        h(PianoButton, {pianoKey: '1cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '1dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'sharp'}),
        h(PianoButton, {pianoKey: '1fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '1gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2ais', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'sharp'}),
        h(PianoButton, {pianoKey: '2cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'sharp'}),
        h(PianoButton, {pianoKey: '2fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2ais', type: 'sharp'}),
      ])
  },
})

export const PianoSharp = styled(HPianoSharp, {
  '&>*': {
    mr: 20,
  },
  flexWrap: 'nowrap',
  height: 300,
  overflow: 'visible',
  pl: 45,
  pointerEvents: 'none',
  position: 'relative',
  whiteSpace: 'nowrap',
  width: '100%',
})
