import {defineComponent, h} from 'vue'
import {useControlDialog} from './use-dialog'

export const HDialogClose = defineComponent({
  emits: {
    click: (event: MouseEvent) => event,
  },
  setup(props, {slots, emit}) {
    const controlDialog = useControlDialog()

    const handleClick = (event) => {
      controlDialog.open(false)
      emit('click', event)
    }

    return () => {
      return slots.button
        ? slots.button(controlDialog)
        : h('button', {onClick: handleClick}, slots.default?.())
    }
  },
})
