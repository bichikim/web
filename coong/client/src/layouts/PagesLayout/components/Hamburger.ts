import {QBtn} from 'quasar'
import {defineComponent, withDirectives, h} from 'vue'
import {directiveEmotion} from 'src/emotion'

export const Hamburger = defineComponent({
  setup() {
    const emotion = directiveEmotion()
    const onHamburger = () => {
      console.log('hamburger')
    }
    return () => (
      withDirectives(h(QBtn, {onClick: onHamburger}), [[emotion, {backgroundColor: 'red'}]])
    )
  },
})
