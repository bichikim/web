import {useSound} from '@vueuse/sound'
import {Howl} from 'howler'
import {useUntilTo} from 'src/hooks/until-to'
import {computed, Ref, toRef} from 'vue'
import {indexKeys} from './source'

interface PlayOptions {
  forceSoundEnabled?: boolean
  id?: number
  playbackRate?: number
}

type PlayFunction = (options?: PlayOptions) => void

export interface DamperOptions {
  step?: number
  tick?: number
}

export interface UsePianoOptions {
  damper?: DamperOptions

  softPedal?: boolean

  sustainPedal?: boolean
}

export interface ReturnedValue {
  down: PlayFunction
  duration: Ref<number | null>
  isPlaying: Ref<boolean>
  mute: (id?: number) => void
  pause: (id?: number) => void
  sound: Ref<Howl | null>

  up: () => void
}

export type PianoKeys = keyof typeof indexKeys

const MAX_VOLUME = 100
const SOFT_VOLUME = 80
const DEFAULT_DAMPER_STEP = 10
const DEFAULT_DAMPER_TICK = 50
export const usePiano = (
  key: PianoKeys,
  options: UsePianoOptions = {},
): ReturnedValue => {
  const damperOption = toRef(options, 'damper', {})
  const sustainPedal = toRef(options, 'sustainPedal', false)
  const softPedal = toRef(options, 'softPedal', false)
  const {value: volume, run: runUntilTo, stop: stopUntilTo} = useUntilTo(MAX_VOLUME)
  const sound = useSound(indexKeys[key], {
    interrupt: true,
    volume: computed(() => {
      return volume.value / MAX_VOLUME
    }),
  })

  const up = () => {
    const _sustainPedal = sustainPedal.value
    if (_sustainPedal) {
      return
    }
    const _damperOption = damperOption.value
    runUntilTo(
      0,
      _damperOption?.step ?? DEFAULT_DAMPER_STEP,
      _damperOption?.tick ?? DEFAULT_DAMPER_TICK,
    )
  }

  const down = () => {
    stopUntilTo()
    volume.value = softPedal.value ? SOFT_VOLUME : MAX_VOLUME
    sound.play()
  }

  const mute = () => {
    stopUntilTo()
    volume.value = MAX_VOLUME
    sound.stop()
  }

  return {
    ...sound,
    down,
    mute,
    up,
  }
}
