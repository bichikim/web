import {ionVolumeHighSharp, ionVolumeMuteSharp} from '@quasar/extras/ionicons-v6'
import {useClassName} from '@winter-love/hyper-components'
import {QBtn} from 'quasar'
import {computed, defineComponent, Fragment, h, ref, watch} from 'vue'

export const AudioButton = defineComponent({
  render() {
    const {audioIcon, toggleAudio} = this
    const className = useClassName()
    return (
      h(Fragment, [
        h('audio', {
          loop: true,
          ref: 'audio',
          src: 'https://static.coong.io/coong-front/audios/intro.mp3',
        }),
        h(QBtn, {
          class: [
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
          ],
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

