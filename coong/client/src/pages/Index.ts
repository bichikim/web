import {defineComponent, ref} from 'vue'
import {ZText} from '@namchee/vue-ztext'
import {QPage} from 'quasar'

const IndexPage = defineComponent({
  components: {
    QPage,
    ZText,
  },
  setup() {
    const toggle = ref(false)
    return {
      toggle,
    }
  },
  template: `
    <q-page v-css="{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}">
      <z-text
        eventRotation="10deg"
        depth="60px"
        fade
        eventDirection="default"
        event="pointer"
        v-css="{fontSize: '10em', color: 'lightcoral'}"
      >
        Coong 🤩
      </z-text>
    </q-page>
  `,
})

export default IndexPage
