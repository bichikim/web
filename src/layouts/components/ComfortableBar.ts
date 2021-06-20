import {QBtn, QBtnGroup} from 'quasar'
import {
  defineComponent, h, PropType, toRef,
} from 'vue'

export interface ButtonContext {
  color?: string
  content?: any
  name: any
}

export const ComfortableBar = defineComponent({
  name: 'ComfortableBar',
  props: {
    buttons: {default: () => [], type: Array as PropType<ButtonContext[]>},
  },
  render() {
    return (
      h(QBtnGroup, {push: true}, () => this.buttons.map((button) => {
        const {color = 'glass-primary', content, name} = button
        return (
          h(QBtn, {color, push: true}, () => content ?? name)
        )
      }))
    )
  },
  setup(props) {
    const buttonsRef = toRef(props, 'buttons')

    return {
      buttonsRef,
    }
  },
})
