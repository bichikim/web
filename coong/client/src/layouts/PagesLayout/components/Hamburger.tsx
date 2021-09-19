import {QBtn} from 'src/quasar'
import {defineComponent} from 'vue'

export const Hamburger = defineComponent({
  setup() {
    const onHamburger = () => {
      console.log('hamburger')
    }
    return () => (
      <div>
        <QBtn v-stitches={[{color: 'white', backgroundColor: '$red1'}]} onClick={onHamburger} icon='ion-menu' />
      </div>

    )
  },
})
