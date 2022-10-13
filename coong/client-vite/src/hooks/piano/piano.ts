import {PlayFunction} from '@vueuse/sound/dist/esm/src/types'
import {Ref} from 'vue'
import {indexKeys} from './source'
import {Howl} from 'howler'
import {useSound} from '@vueuse/sound'

export interface ReturnedValue {
  duration: Ref<number | null>
  isPlaying: Ref<boolean>
  pause: (id?: number) => void
  play: PlayFunction
  sound: Ref<Howl | null>
  stop: (id?: number) => void
}

export type PianoKeys = keyof typeof indexKeys

export const usePiano = (key: PianoKeys): ReturnedValue => {
  return useSound(indexKeys[key])
}
