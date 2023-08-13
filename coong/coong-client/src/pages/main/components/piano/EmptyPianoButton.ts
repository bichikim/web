import {defineComponent, h} from 'vue'

export const HEmptyPianoButton = defineComponent({
  name: 'HEmptyPianoButton',
  setup() {
    return () =>
      h('div', {
        class: 'inline-block flex-shrink-0 h-full pointer-event-none w-50px mr-30px',
      })
  },
})
