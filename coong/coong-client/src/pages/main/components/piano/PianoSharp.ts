import {styled} from '@winter-love/uni'
import {PianoButton} from './PianoButton'
import {EmptyPianoButton} from './EmptyPianoButton'
import {defineComponent, h} from 'vue'

export const HPianoSharp = defineComponent({
  name: 'PianoSharp',
  setup() {
    return () =>
      h('div', [
        h(PianoButton, {pianoKey: '-1ais', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '-1cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '-1dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '-1fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '-1gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '0ais', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '0cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '0dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
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
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '4cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '4dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '4fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '4gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '5ais', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '5cis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '5dis', type: 'sharp'}),
        h(EmptyPianoButton, {type: 'emptySharp'}),
        h(PianoButton, {pianoKey: '5fis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '5gis', type: 'sharp'}),
        h(PianoButton, {pianoKey: '6ais', type: 'sharp'}),
      ])
  },
})

export const PianoSharp = styled(
  HPianoSharp,
  {
    marginRight: 30,
  },
  {
    '&>*': {
      marginRight: 30,
    },
    display: 'flex',
    flexWrap: 'nowrap',
    height: '100%',
    overflow: 'visible',
    pb: 207,
    pl: 55,
    pointerEvents: 'none',
    position: 'relative',
    whiteSpace: 'nowrap',
    width: '100%',
  },
)
