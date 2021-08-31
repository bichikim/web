import {QBtn} from 'src/quasar'
import {defineComponent} from 'vue'

export const Hamburger = defineComponent({
  setup() {
    const onHamburger = () => {
      console.log('hamburger')
    }
    return () => (
      <QBtn v-emotion={[{color: 'white', backgroundColor: 'red'}]} onClick={onHamburger}>foo</QBtn>
    )
  },
})
