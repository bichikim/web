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

export const usePiano = (): Record<keyof typeof indexKeys, ReturnedValue> => {
  return Object.fromEntries(
    Object.entries(indexKeys).map(([key, value]) => {
      return [key, useSound(value)]
    }),
  ) as any
}
