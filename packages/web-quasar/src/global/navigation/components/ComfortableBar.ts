import {computed, defineComponent, toRef, PropType, h} from 'vue'
import {QBtn, QBtnGroup} from 'quasar'
import {ButtonContext} from '../hooks/navigation'

export const ComfortableBar = defineComponent({
  name: 'ComfortableBar',
  props: {
    buttons: {type: Array as PropType<ButtonContext[]>, default: () => []},
  },
  render() {
    return (
      h(QBtnGroup, {push: true}, () => this.buttons.map((button) => {
        const {color = 'glass-primary'} = button
        return (
          h(QBtn, {color, push: true}, () => button.content ?? button.name)
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
