import {QBtn} from 'quasar'
import {defineComponent} from 'vue'
import {useCreateEmotionNode} from 'src/emotion'

export const Hamburger = defineComponent({
  setup() {
    const e = useCreateEmotionNode()
    const onHamburger = () => {
      console.log('hamburger')
    }
    return () => (
      e(QBtn, {$emotion: {backgroundColor: 'red', color: 'white'}, onClick: onHamburger}, () => 'Ham')
    )
  },
})
