import {ionVolumeHighSharp, ionVolumeMuteSharp} from '@quasar/extras/ionicons-v6'
import {QBtn} from 'quasar'
import {computed, defineComponent, Fragment, h, ref, watch} from 'vue'
import {className} from 'src/plugins/hyper-components'

const button = () => [
  className({
    position: 'absolute',
    right: 0,
    transform: 'translateX(100%)',
  }),
  className({
    '@bp1': {
      fontSize: '0.7rem',
    },
    '@bp2': {
      fontSize: '0.9rem',
    },
    '@bp3': {
      fontSize: '1rem',
    },
  }),
]

export const AudioButton = defineComponent({
  name: 'AudioButton',
  render() {
    const {audioIcon, toggleAudio} = this
    return (
      h(Fragment, [
        h('audio', {
          loop: true,
          ref: 'audio',
          src: 'https://static.coong.io/coong-front/audios/intro.mp3',
        }),
        h(QBtn, {
          class: button(),
          flat: true,
          icon: audioIcon,
          onClick: toggleAudio,
          round: true,
        }),
      ])
    )
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
    const audioIcon = computed(() => {
      return playAudioRef.value ? ionVolumeHighSharp : ionVolumeMuteSharp
    })
    const toggleAudio = () => {
      playAudioRef.value = !playAudioRef.value
    }
    return {
      audio: audioRef,
      audioIcon,
      toggleAudio,
    }
  },
})

