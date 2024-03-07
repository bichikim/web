import {HPianoButton} from './HPianoButton'
import {HEmptyPianoButton} from './EmptyPianoButton'
import {defineComponent, h} from 'vue'
import {flatten} from '@winter-love/lodash'
const sharpSet = flatten(
  Array(8)
    .fill([
      {key: 1, name: 'G#'},
      {key: 3, name: 'A#'},
      {key: 0, name: 'empty'},
      {key: 6, name: 'C#'},
      {key: 8, name: 'D#'},
      {key: 0, name: 'empty'},
      {key: 11, name: 'F#'},
    ])
    .map((item, index) => {
      return item.map(({key, name}) => ({key: 12 * index + key - 5, name}))
    }),
)

sharpSet.shift()
sharpSet.splice(-5)

// h(HPianoButton, {pianoKey: '-1ais', type: 'sharp'}),
//           h(HEmptyPianoButton, {type: 'emptySharp'}),
export const HPianoSharp = defineComponent({
  emits: ['up', 'down'],
  name: 'PianoSharp',
  props: {
    disabled: {default: false, type: Boolean},
  },
  setup(props, {emit}) {
    const onUp = (key: string | number) => {
      emit('up', key)
    }
    const onDown = (key: string | number) => {
      emit('down', key)
    }
    return () =>
      h(
        'div',
        {
          class: [
            'flex h-full overflow-visible pb-207px pl-55px flex-nowrap pointer-events-none absolute whitespace-nowrap',
            'w-full mr-30px',
          ],
        },
        sharpSet.map(({key, name}) => {
          if (name === 'empty') {
            return h(HEmptyPianoButton, {type: 'emptySharp'})
          }
          return h(HPianoButton, {
            disabled: props.disabled,
            onDown,
            onUp,
            pianoKey: key,
            type: 'sharp',
          })
        }),
      )
  },
})
