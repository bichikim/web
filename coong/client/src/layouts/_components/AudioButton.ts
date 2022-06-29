import {ionVolumeHighSharp, ionVolumeMuteSharp} from '@quasar/extras/ionicons-v5'
import {resolveUrl} from '@winter-love/utils'
import {HBtn} from '@winter-love/hyper-components'
import {staticUrl} from 'src/environment'
import {computed, defineComponent, h, ref, watch} from 'vue'

export const AudioButton = defineComponent({
  name: 'AudioButton',
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
    const onToggleAudio = () => {
      playAudioRef.value = !playAudioRef.value
    }

    return () =>
      h(
        HBtn,
        {
          flat: true,
          icon: audioIcon.value,
          onClick: onToggleAudio,
          round: true,
        },
        () => [
          h('audio', {
            loop: true,
            ref: audioRef,
            src: resolveUrl(staticUrl(), '/audios/intro.mp3'),
          }),
        ],
      )
  },
})
