import type {LipSyncCue, LipSyncMotion, LipSyncWeights} from '../lipsync/types'
import type {VoiceAudio} from './synthesis'

interface MouthMotionInput {
  readonly audio: VoiceAudio
  readonly elapsed: number
  readonly clock: number
  readonly fallback: LipSyncWeights
  readonly speed?: number
}
interface MouthMotionFrame {
  readonly weights: LipSyncWeights
  readonly motion?: LipSyncMotion
  readonly closure?: number
}
interface MotionEnding {
  readonly start: number
  readonly weights: LipSyncWeights
}
const PREPARE_SECONDS = 0.06
const PREPARE_STRENGTH = 0.35
const ONSET_SECONDS = 0.04
const LOOKAHEAD_SECONDS = 0.035
const MINIMUM_HOLD = 0.07
const FINAL_HOLD = 0.07
const RELEASE_SECONDS = 0.16
const SMOOTHSTEP_COEFFICIENT = 3
const CLOSING_SECONDS = 0.025
const REOPEN_SECONDS = 0.04
const smooth = (value: number) => {
  const amount = Math.max(0, Math.min(1, value))
  return amount * amount * (SMOOTHSTEP_COEFFICIENT - 2 * amount)
}
const cueWeights = (cue: LipSyncCue, fallback: LipSyncWeights): LipSyncWeights =>
  cue.shape === null ? fallback : {[cue.shape]: 1}
const endingFrame = (ending: MotionEnding, clock: number): MouthMotionFrame | null => {
  const elapsed = clock - ending.start
  if (elapsed >= FINAL_HOLD + RELEASE_SECONDS) {
    return null
  }
  const motion: LipSyncMotion =
    elapsed < FINAL_HOLD
      ? {phase: 'hold', weight: 1}
      : {phase: 'release', weight: 1 - smooth((elapsed - FINAL_HOLD) / RELEASE_SECONDS)}
  return {motion, weights: ending.weights}
}
const preparation = (cue: LipSyncCue, input: MouthMotionInput): MouthMotionFrame => {
  const elapsed = (input.elapsed - cue.start) / (input.speed ?? 1)
  const weight =
    elapsed < 0
      ? PREPARE_STRENGTH * smooth((elapsed + PREPARE_SECONDS) / PREPARE_SECONDS)
      : PREPARE_STRENGTH + (1 - PREPARE_STRENGTH) * smooth(elapsed / ONSET_SECONDS)
  return {motion: {phase: 'prepare', weight}, weights: cueWeights(cue, input.fallback)}
}
const cueEndClock = (input: MouthMotionInput, end: number) =>
  input.clock + (end - input.elapsed) / (input.speed ?? 1)
const closureAt = (input: MouthMotionInput): number => {
  const speed = input.speed ?? 1
  const cues = input.audio.shapeCues ?? []
  return cues.reduce((amount, cue) => {
    if (cue.shape !== 'closed') {
      return amount
    }
    const before = (input.elapsed - cue.start) / speed
    const after = (input.elapsed - cue.end) / speed
    const closing = smooth(1 + before / CLOSING_SECONDS)
    const opening = cue === cues.at(-1) ? 1 : 1 - smooth(after / REOPEN_SECONDS)
    return Math.max(amount, closing * opening)
  }, 0)
}
const closeWeights = (weights: LipSyncWeights, amount: number): LipSyncWeights =>
  amount === 1
    ? {closed: 1}
    : {
        ...Object.fromEntries(
          Object.entries(weights).map(([shape, weight]) => [shape, weight * (1 - amount)]),
        ),
        closed: (weights.closed ?? 0) * (1 - amount) + amount,
      }

/** Art-directs mouth form on the audio clock; opening and loudness stay in their own channels. */
export const createMouthMotion = () => {
  let source: VoiceAudio | null = null
  let selected: LipSyncCue | null = null
  let selectedAt = 0
  let latest: MouthMotionInput | null = null
  let output: MouthMotionFrame = {weights: {}}
  let ending: MotionEnding | null = null
  const pose = (input: MouthMotionInput): MouthMotionFrame => {
    const cues = input.audio.shapeCues?.filter((cue) => cue.shape !== 'closed')
    const first = cues?.[0]
    const last = cues?.at(-1)
    const speed = input.speed ?? 1
    if (first === undefined || last === undefined) {
      return {weights: input.fallback}
    }
    if (input.elapsed < first.start - PREPARE_SECONDS * speed) {
      return {weights: {}}
    }
    if (input.elapsed >= last.end) {
      return (
        endingFrame(
          {start: cueEndClock(input, last.end), weights: cueWeights(last, input.fallback)},
          input.clock,
        ) ?? {weights: {}}
      )
    }
    if (
      first.shape !== null &&
      input.elapsed < Math.min(first.end, first.start + ONSET_SECONDS * speed)
    ) {
      return preparation(first, input)
    }
    const target = cues?.find((cue) => input.elapsed + LOOKAHEAD_SECONDS * speed < cue.end) ?? last
    if (target.shape === null) {
      selected = null
      return {weights: input.fallback}
    }
    if (selected === null || (target !== selected && input.clock - selectedAt >= MINIMUM_HOLD)) {
      selected = target
      selectedAt = input.clock
    }
    return {weights: cueWeights(selected, input.fallback)}
  }
  return {
    finish: (clock: number) => {
      if (latest === null || Object.values(output.weights).every((weight) => weight === 0)) {
        return false
      }
      const end = latest.audio.shapeCues?.at(-1)?.end
      ending = {
        start: end === undefined ? clock : cueEndClock(latest, end),
        weights: output.weights,
      }
      return endingFrame(ending, clock) !== null
    },
    relax: (clock: number) => (ending === null ? null : endingFrame(ending, clock)),
    reset: () => {
      source = null
      selected = null
      latest = null
      ending = null
      output = {weights: {}}
    },
    update: (input: MouthMotionInput) => {
      if (source !== input.audio) {
        source = input.audio
        selected = null
      }
      ending = null
      latest = input
      const form = pose(input)
      const closure = closureAt(input)
      output =
        closure > 0 ? {closure, weights: closeWeights(form.weights, closure)} : {...form, closure}
      return output
    },
  }
}
