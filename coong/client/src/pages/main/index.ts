import {ionVolumeHighSharp, ionVolumeMuteSharp} from '@quasar/extras/ionicons-v6'
import {QBtn, QPage} from 'quasar'
import {computed, defineComponent, ref, watch} from 'vue'
import {BackdropFilterText} from './BackdropFilterText'
import {useClassName} from '@winter-love/hyper-components'

const IndexPage = defineComponent({
  components: {
    BackdropFilterText,
    QBtn,
    QPage,
  },
  setup() {
    const playAudioRef = ref(false)
    const audioRef = ref<undefined | HTMLAudioElement>()
    const className = useClassName()

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
      className,
    }
  },
  template: `
    <q-page >
    <div :class="className({width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'})">
    <video
      muted
      autoplay
      loop
      playsinline
      :class="className({
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
      })"
    >
      <source src="https://static.coong.io/coong-front/videos/intro.mp4" type="video/mp4">
    </video>
    <audio
      ref="audio"
      loop
      src="https://static.coong.io/coong-front/audios/intro.mp3"
    ></audio>
    <div
      :class="className({
        fontSize: '3rem',
        fontWeight: '900', 
        color: 'mistyrose',
        position: 'absolute',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        left: '50%',
        bottom: '46%',
        transform: 'translate(-50%, +50%)',
      })"
      v-css:bp2="{
        fontSize: '5rem',
        fontWeight: '900', 
      }"
      v-css:bp3="{
        fontSize: '7rem',
        fontWeight: '900', 
      }"
    >
      <backdrop-filter-text
        :class="className({
          $$activeColor: 'rgba(200, 200, 200, 0.1)',
          $$filter: 'blur(5px) hue-rotate(80deg)',
        })"
      >
        Coong
      </backdrop-filter-text>
      <q-btn
        :icon="audioIcon"
        flat
        round
        @click="toggleAudio "
        v-css="{
          fontSize: '0.7rem',
          position: 'absolute',
          right: 0,
          bottom: 0,
          transform: 'translateX(100%)',
        }"
        v-css:bp2="{
          fontSize: '0.9rem',
        }"
        v-css:bp3="{
          fontSize: '1rem',
        }"
      />
    </div>
    </div>
    </q-page>
  `,
})

export default IndexPage
