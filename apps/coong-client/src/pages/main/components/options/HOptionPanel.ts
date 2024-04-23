import {defineComponent, h} from 'vue'

export const HOptionPanel = defineComponent({
  emits: ['scale'],
  name: 'HOptionPanel',
  props: {
    scale: {default: 100, type: Number},
  },
  setup: (props, {emit}) => {
    const onChangeScale = (event: InputEvent & {target: any}) => {
      emit('scale', Number(event.target.value))
    }
    return () =>
      h('div', {class: 'b-3px b-black b-solid p-0.5rem bg-white rd-4px'}, [
        //
        h('form', {}, [
          //
          h('label', {for: 'scale'}, 'Scale '),
          h('input', {
            id: 'scale',
            max: 100,
            min: 30,
            onInput: onChangeScale,
            type: 'range',
            value: props.scale,
          }),
        ]),
      ])
  },
})
