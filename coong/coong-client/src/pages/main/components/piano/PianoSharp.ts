import {styled} from '@winter-love/uni'
import {PianoButton} from './PianoButton'
import {EmptyPianoButton} from './EmptyPianoButton'
import {defineComponent, h} from 'vue'

export const HPianoSharp = defineComponent({
  name: 'PianoSharp',
  setup() {
    return () =>
      h('div', [
        h(PianoButton, {pianoKey: '0fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '0gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '1ais', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '1cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '1dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '1fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '1gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2ais', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '2cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '2fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '2ais', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '3cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '3dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '3fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '3gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '4ais', type: 'sharp'}),
      ])
  },
})

export const PianoSharp = styled(HPianoSharp, {
  display: 'flex',
  flexWrap: 'nowrap',
  gap: 20,
  height: '60%',
  overflow: 'visible',
  pl: 45,
  pointerEvents: 'none',
  position: 'relative',
  whiteSpace: 'nowrap',
  width: '100%',
})
