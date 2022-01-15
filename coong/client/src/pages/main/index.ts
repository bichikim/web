import {ionVolumeHighSharp, ionVolumeMuteSharp} from '@quasar/extras/ionicons-v6'
import {QBtn, QPage} from 'quasar'
import {computed, defineComponent, h, ref, watch} from 'vue'
import {BackdropFilterText} from './BackdropFilterText'
import {useClassName} from '@winter-love/hyper-components'

const IndexPage = defineComponent({
  name: 'IndexPage',
  render() {
    const {audioIcon, toggleAudio} = this
    const className = useClassName()
    return (
      h(QPage, () => [
        h('div', {
          class: className({alignItems: 'center', display: 'flex', justifyContent: 'center', width: '100%'}),
        }, [
          h('video', {
            autoplay: true,
            class: className({
              height: '100%',
              left: '50%',
              maxWidth: '100%',
              minHeight: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              zIndex: '-1000',
            }),
            loop: true,
            muted: true,
            playsinline: true,
          }, [
            h('source', {
              src: 'https://static.coong.io/coong-front/videos/intro.mp4',
              type: 'video/mp4',
            }),
          ]),
          //
          h('audio', {
            ref: 'audio',
            src: 'https://static.coong.io/coong-front/audios/intro.mp3',
          }),
          //
          h('div', {
            class: [
              className({
                alignItems: 'flex-end',
                bottom: '46%',
                color: 'mistyrose',
                display: 'flex',
                flexDirection: 'row',
                fontSize: '3rem',
                fontWeight: '900',
                left: '50%',
                position: 'absolute',
                transform: 'translate(-50%, +50%)',
              }), className({
                '@bp2': {
                  fontSize: '5rem',
                  fontWeight: '900',
                },
                '@bp3': {
                  fontSize: '7rem',
                  fontWeight: '900',
                },
              }),
            ],
          }, [
            h(BackdropFilterText, {
              class: className({
                $$activeColor: 'rgba(200, 200, 200, 0.1)',
                $$filter: 'blur(5px) hue-rotate(80deg)',
              }),
            }, () => [
              'Coong',
            ]),
            ///
            h(QBtn, {
              class: [
                className({
                  bottom: 0,
                  fontSize: '0.7rem',
                  position: 'absolute',
                  right: 0,
                  transform: 'translateX(100%)',
                }),
                className({
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
          ]),
        ]),
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
})

export default IndexPage
