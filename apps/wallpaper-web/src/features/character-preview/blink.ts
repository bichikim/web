import type {Player} from '@winter-love/puppet/player'

const EYES = ['ParamEyeLOpen', 'ParamEyeROpen']
const MINIMUM_INTERVAL = 3000
const INTERVAL_VARIATION = 3000
const CLOSING = 100
const CLOSED_UNTIL = 150
const DURATION = 300
const SMOOTHSTEP_WEIGHT = 3
const smooth = (progress: number) => progress * progress * (SMOOTHSTEP_WEIGHT - 2 * progress)
const opennessAt = (elapsed: number) => {
  if (elapsed < CLOSING) {
    return 1 - smooth(elapsed / CLOSING)
  }
  if (elapsed < CLOSED_UNTIL) {
    return 0
  }
  return smooth((elapsed - CLOSED_UNTIL) / (DURATION - CLOSED_UNTIL))
}
const interval = (random: number) => MINIMUM_INTERVAL + random * INTERVAL_VARIATION

interface CharacterBlinkFrames {
  /** Schedules one callback with a monotonic timestamp in milliseconds; returns its handle. */
  readonly request: (callback: FrameRequestCallback) => number
  /** Cancels a previously scheduled callback by its handle. */
  readonly cancel: (handle: number) => void
}

interface ConnectCharacterBlinkOptions {
  /** Borrowed eye blend controls; cleanup releases this connection's eye overrides. */
  readonly player: Pick<Player, 'setParameterBlend'>
  /** Returns a value from 0 to 1 whenever the next blink interval is chosen. */
  readonly random: () => number
  /** Borrowed frame scheduler; cleanup cancels only this connection's pending frame. */
  readonly frames: CharacterBlinkFrames
}

/** Multiplies the current eye pose so selected expressions and motions keep their own openness. */
export const connectCharacterBlink = (options: ConnectCharacterBlinkOptions): (() => void) => {
  const {frames, player, random} = options
  let next: number | null = null
  let blinking = false
  let previous: number | null = null
  let frame = 0
  const release = () => {
    for (const eye of EYES) {
      player.setParameterBlend(eye)
    }
  }
  const advance = (time: number) => {
    next ??= time + interval(random())
    const elapsed = time - next
    if (elapsed >= DURATION) {
      if (blinking) {
        release()
      }
      blinking = false
      previous = null
      next = time + interval(random())
    } else if (elapsed >= 0) {
      const value = opennessAt(elapsed)
      blinking = true
      if (value !== previous) {
        for (const eye of EYES) {
          player.setParameterBlend(eye, {mode: 'multiply', value})
        }
        previous = value
      }
    }
    frame = frames.request(advance)
  }
  frame = frames.request(advance)
  return () => {
    frames.cancel(frame)
    release()
  }
}
