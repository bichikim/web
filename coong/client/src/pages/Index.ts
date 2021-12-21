import {ZText} from '@namchee/vue-ztext'
import {QPage} from 'quasar'
import {defineComponent, ref} from 'vue'

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
    <video
      muted
      autoplay
      loop
      v-css="{
       minHeight: '100%',
       maxWidth: '100%',
       width: '100%',
       height: '100%',
       position: 'absolute',
       objectFit: 'cover',
       left: '50%',
       transform: 'translate(-50%, -50%)',
       top: '50%',
    }">
      <source src="/videos/intro.mp4" type="video/mp4">
    </video>
    <z-text
      eventRotation="10deg"
      depth="60px"
      fade
      eventDirection="default"
      event="pointer"
      v-css="{fontSize: '10em', color: 'mistyrose'}"
    >
      Coong
    </z-text>
    </q-page>
  `,
})

export default IndexPage
