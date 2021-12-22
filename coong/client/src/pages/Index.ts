import {QPage} from 'quasar'
import {defineComponent, ref} from 'vue'

const IndexPage = defineComponent({
  components: {
    QPage,
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
      playsinline
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
       zIndex: '-1000'
      }"
    >
      <source src="https://storage.googleapis.com/coong-static-production/coong-front/videos/intro.mp4" type="video/mp4">
    </video>
    <span
      v-css="{
        fontSize: '4em',
        color: 'mistyrose',
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }"
      v-css:bp3="{
        fontSize: '10em',
      }"
    >
      Coong
    </span>
    </q-page>
  `,
})

export default IndexPage
