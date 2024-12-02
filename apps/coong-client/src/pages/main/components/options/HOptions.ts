import {onClickOutside} from '@winter-love/use'
import {defineComponent, h, ref, Ref} from 'vue'
import {HOptionButton} from './HOptionButton'
import {HOptionPanel} from './HOptionPanel'

export const HOptions = defineComponent({
  emits: ['scale'],
  name: 'HOptions',
  props: {
    scale: {default: 100, type: Number},
  },
  setup(props, {emit}) {
    const show = ref(false)
    const rootElement: Ref<any> = ref()
    const toggleShow = () => {
      show.value = !show.value
    }
    const onClose = () => {
      show.value = false
    }

    const onScale = (value: number) => {
      emit('scale', value)
    }
    onClickOutside(rootElement as any, () => {
      onClose()
    })
    return () =>
      //
      h('div', {ref: rootElement}, [
        //
        h(HOptionButton, {onClick: toggleShow}),
        show.value &&
          h(HOptionPanel, {
            class: 'absolute left-0 top-0 translate-y--100% translate-x--100%',
            onScale,
            scale: props.scale,
          }),
      ])
  },
})
