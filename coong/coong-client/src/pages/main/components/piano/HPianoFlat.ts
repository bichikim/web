import {HPianoButton} from './HPianoButton'
import {defineComponent, h} from 'vue'
import {flatten} from '@winter-love/lodash'

const flatSet = flatten(
  Array(8)
    .fill([
      {key: 2, name: 'A'},
      {key: 4, name: 'B'},
      {key: 5, name: 'C'},
      {key: 7, name: 'D'},
      {key: 9, name: 'E'},
      {key: 10, name: 'F'},
      {key: 12, name: 'G'},
    ])
    .map((item, index) => {
      return item.map(({key, name}) => ({key: 12 * index + key - 5, name}))
    }),
)

// eslint-disable-next-line no-magic-numbers
flatSet.splice(-4)
// h(HPianoButton, {keyName: 'A', pianoKey: 2}),
export const HPianoFlat = defineComponent({
  emits: ['up', 'down'],
  name: 'PianoFlat',
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
        {class: 'h-full pointer-events-none relative whitespace-nowrap w-full'},
        flatSet.map(({key, name}) =>
          h(HPianoButton, {
            disabled: props.disabled,
            key,
            keyName: name,
            onDown,
            onUp,
            pianoKey: key,
          }),
        ),
      )
  },
})
