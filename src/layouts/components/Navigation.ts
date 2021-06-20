import {QToolbar} from 'quasar'
import {defineComponent, h, PropType} from 'vue'
import {ButtonContext, ComfortableBar} from './ComfortableBar'
import {Hamburger} from './Hamburger'

export const Navigation = defineComponent({
  emits: ['click:home'],
  name: 'Navigation',
  props: {
    buttons: {default: () => [], type: Array as PropType<ButtonContext[]>},
  },
  render() {
    return (
      h(QToolbar, {class: ''}, () => [
        h('div', {class: 'q-gutter-md'}, [
          h(Hamburger, {}),
          h(ComfortableBar, {buttons: this.buttons}),
        ]),
      ])
    )
  },
  setup() {
    return {
      //
    }
  },
})
