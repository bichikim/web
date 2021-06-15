import {defineComponent, h, PropType} from 'vue'
import {QToolbar} from 'quasar'
import {ComfortableBar, ButtonContext} from './ComfortableBar'
import {Hamburger} from './Hamburger'

export const Navigation = defineComponent({
  props: {
    buttons: {type: Array as PropType<ButtonContext[]>, default: () => []},
  },
  name: 'Navigation',
  emits: ['click:home'],
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
