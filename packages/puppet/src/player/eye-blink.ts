import type {RandomSource} from './random'

/** Seconds of each blink phase and the mean time between blinks (Cubism's defaults). */
export interface EyeBlinkTiming {
  readonly closed: number
  readonly closing: number
  readonly interval: number
  readonly opening: number
}

export const DEFAULT_EYE_BLINK_TIMING: EyeBlinkTiming = {
  closed: 0.05,
  closing: 0.1,
  interval: 4,
  opening: 0.15,
}

/**
 * `timing` with omitted values from the defaults (Cubism's blinking interval and settings);
 * `undefined` when a value is not a positive finite number.
 */
export const resolveEyeBlinkTiming = (
  timing: Partial<EyeBlinkTiming> | undefined,
): EyeBlinkTiming | undefined => {
  const resolved: EyeBlinkTiming = {
    closed: timing?.closed ?? DEFAULT_EYE_BLINK_TIMING.closed,
    closing: timing?.closing ?? DEFAULT_EYE_BLINK_TIMING.closing,
    interval: timing?.interval ?? DEFAULT_EYE_BLINK_TIMING.interval,
    opening: timing?.opening ?? DEFAULT_EYE_BLINK_TIMING.opening,
  }
  return Object.values(resolved).every((value) => Number.isFinite(value) && value > 0)
    ? resolved
    : undefined
}

/** Where a blink is: waiting until `next`, or in a phase that started at `since`. */
export type EyeBlinkState =
  | {readonly next: number; readonly phase: 'open'; readonly time: number}
  | {
      readonly phase: 'closing' | 'closed' | 'opening'
      readonly since: number
      readonly time: number
    }

/** The next blink, uniformly within twice the interval so blinks average `interval` apart. */
const scheduleBlink = (time: number, timing: EyeBlinkTiming, random: RandomSource) =>
  time + random() * 2 * timing.interval

export const createEyeBlinkState = (
  timing: EyeBlinkTiming,
  random: RandomSource,
): EyeBlinkState => ({
  next: scheduleBlink(0, timing, random),
  phase: 'open',
  time: 0,
})

/** Advances the blink by `deltaTime` and returns the new state and eye openness (0..1). */
export const advanceEyeBlink = (
  state: EyeBlinkState,
  deltaTime: number,
  options: {readonly random: RandomSource; readonly timing: EyeBlinkTiming},
): {readonly openness: number; readonly state: EyeBlinkState} => {
  const time = state.time + Math.max(0, Number.isFinite(deltaTime) ? deltaTime : 0)
  const {timing} = options
  switch (state.phase) {
    case 'open':
      return time > state.next
        ? {openness: 1, state: {phase: 'closing', since: time, time}}
        : {openness: 1, state: {...state, time}}
    case 'closing': {
      const progress = (time - state.since) / timing.closing
      return progress >= 1
        ? {openness: 0, state: {phase: 'closed', since: time, time}}
        : {openness: 1 - progress, state: {...state, time}}
    }
    case 'closed':
      return (time - state.since) / timing.closed >= 1
        ? {openness: 0, state: {phase: 'opening', since: time, time}}
        : {openness: 0, state: {...state, time}}
    case 'opening': {
      const progress = (time - state.since) / timing.opening
      return progress >= 1
        ? {
            openness: 1,
            state: {next: scheduleBlink(time, timing, options.random), phase: 'open', time},
          }
        : {openness: progress, state: {...state, time}}
    }
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}
