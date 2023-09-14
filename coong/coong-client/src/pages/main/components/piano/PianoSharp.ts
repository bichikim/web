import {HPianoButton} from './PianoButton'
import {HEmptyPianoButton} from './EmptyPianoButton'
import {defineComponent, h} from 'vue'

export const HPianoSharp = defineComponent({
  name: 'PianoSharp',
  setup() {
    return () =>
      h(
        'div',
        {
          class: [
            'flex h-full overflow-visible pb-207px pl-55px flex-nowrap pointer-events-none absolute whitespace-nowrap',
            'w-full mr-30px',
          ],
        },
        [
          h(HPianoButton, {pianoKey: '-1ais', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '-1cis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '-1dis', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '-1fis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '-1gis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '0ais', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '0cis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '0dis', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '0fis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '0gis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '1ais', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '1cis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '1dis', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '1fis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '1gis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '2ais', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '2cis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '2dis', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '2fis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '2gis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '2ais', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '3cis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '3dis', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '3fis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '3gis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '4ais', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '4cis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '4dis', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '4fis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '4gis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '5ais', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '5cis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '5dis', type: 'sharp'}),
          h(HEmptyPianoButton, {type: 'emptySharp'}),
          h(HPianoButton, {pianoKey: '5fis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '5gis', type: 'sharp'}),
          h(HPianoButton, {pianoKey: '6ais', type: 'sharp'}),
        ],
      )
  },
})

// export const PianoSharp = styled(
//   HPianoSharp,
//   {
//     marginRight: 30,
//   },
//   {
//     '&>*': {
//       marginRight: 30,
//     },
//     display: 'flex',
//     flexWrap: 'nowrap',
//     height: '100%',
//     overflow: 'visible',
//     pb: 207,
//     pl: 55,
//     pointerEvents: 'none',
//     position: 'relative',
//     whiteSpace: 'nowrap',
//     width: '100%',
//   },
// )
