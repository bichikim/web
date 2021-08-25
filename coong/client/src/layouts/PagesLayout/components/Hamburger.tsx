import {QBtn} from 'quasar'
import {defineComponent} from 'vue'

export const Hamburger = defineComponent({
  setup() {
    return () => (
      <QBtn v-emotion={[{backgroundColor: 'red'}]}/>
    )
  },
})
