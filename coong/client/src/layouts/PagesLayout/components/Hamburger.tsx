import {QBtn} from 'quasar'
import {defineComponent} from 'vue'

export const Hamburger = defineComponent({
  setup() {
    const onHamburger = () => {
      console.log('hamburger')
    }
    return () => (
      <div>
        <QBtn v-stitches={[{backgroundColor: '$red1', color: 'white'}]} onClick={onHamburger} icon='ion-menu'/>
      </div>

    )
  },
})
