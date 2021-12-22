import {QBtn, QPage} from 'quasar'
import {computed, defineComponent, ref, watch} from 'vue'
import {ionVolumeHighSharp, ionVolumeMuteSharp} from '@quasar/extras/ionicons-v6'
import BackdropFilterText from './BackdropFilterText.vue'

const IndexPage = defineComponent({
  components: {
    BackdropFilterText,
    QBtn,
    QPage,
  },
  setup() {
    const playAudioRef = ref(false)
    const audioRef = ref<undefined | HTMLAudioElement>()

    watch(playAudioRef, (state: boolean) => {
      const audio = audioRef.value
      if (!audio) {
        return
      }
      if (state) {
        return audio.play()
      }
      return audio.pause()
    })

    const toggleAudio = () => {
      playAudioRef.value = !playAudioRef.value
    }

    const audioIcon = computed(() => {
      return playAudioRef.value ? ionVolumeHighSharp : ionVolumeMuteSharp
    })

    return {
      audio: audioRef,
      audioIcon,
      toggleAudio,
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
    <audio
      ref="audio"
      loop
      src="https://storage.googleapis.com/coong-static-production/coong-front/audios/intro.mp3"
    ></audio>
    <div
      v-css="{
        color: 'mistyrose',
        position: 'absolute',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        left: '50%',
        bottom: '46%',
        transform: 'translate(-50%, +50%)',
      }"
    >
      <backdrop-filter-text 
        v-css="{fontSize: '7rem', fontWeight: '900', '--active-color': 'rgba(255, 255, 255, 0.4)'}">
        Coong
      </backdrop-filter-text>
      <q-btn 
        :icon="audioIcon"
        flat
        round
        @click="toggleAudio "
        v-css="{
          position: 'absolute',
          right: 0,
          bottom: 0,
          transform: 'translateX(100%)',
        }"
      />
    </div>
    </q-page>
  `,
})

export default IndexPage
