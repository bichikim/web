import {PlayFunction} from '@vueuse/sound/dist/esm/src/types'
import {computed} from '@winter-love/vue-test'
import {Ref} from 'vue'
import {indexKeys} from './source'
import {Howl} from 'howler'
import {useSound} from '@vueuse/sound'
import {useUntilTo} from 'src/hooks/until-to'

export interface ReturnedValue {
  duration: Ref<number | null>
  isPlaying: Ref<boolean>
  muteSmoothly: () => void
  pause: (id?: number) => void
  play: PlayFunction
  sound: Ref<Howl | null>
  stop: (id?: number) => void
}

export type PianoKeys = keyof typeof indexKeys

const MAX_VOLUME = 100
export const usePiano = (key: PianoKeys): ReturnedValue => {
  const {value: volume, run: runUntilTo, stop: stopUntilTo} = useUntilTo(MAX_VOLUME)
  const sound = useSound(indexKeys[key], {
    interrupt: true,
    volume: computed(() => {
      return volume.value / MAX_VOLUME
    }),
  })
  const muteSmoothly = () => {
    runUntilTo(0, 10, 50)
  }

  const play = () => {
    stopUntilTo()
    volume.value = MAX_VOLUME
    sound.play()
  }

  const stop = () => {
    stopUntilTo()
    volume.value = MAX_VOLUME
    sound.stop()
  }

  return {
    ...sound,
    muteSmoothly,
    play,
    stop,
  }
}
