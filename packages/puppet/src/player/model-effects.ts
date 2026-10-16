import type {PuppetDocument} from './document'
import type {PuppetParameterValueMap} from '../deformation'
import {resolveParameterValue} from './parameter-value'

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

/** Where a blink is: waiting until `next`, or in a phase that started at `since`. */
export type EyeBlinkState =
  | {readonly next: number; readonly phase: 'open'; readonly time: number}
  | {
      readonly phase: 'closing' | 'closed' | 'opening'
      readonly since: number
      readonly time: number
    }

/** Uniform 0..1 numbers. */
export type RandomSource = () => number

/** Park–Miller minimal standard generator: exact in doubles, so Rust repeats it. */
const MODULUS = 2_147_483_647
const MULTIPLIER = 48_271

/**
 * Seeded uniform numbers in 0..1 that the Rust player repeats exactly, so seeded random
 * choices (blink timing, motion groups) match across players.
 */
export const createSeededRandom = (seed: number): RandomSource => {
  // Seeds map onto the generator's states 1..MODULUS-1, seed 1 being state 1.
  let state = ((((Math.trunc(seed) - 1) % (MODULUS - 1)) + (MODULUS - 1)) % (MODULUS - 1)) + 1
  return () => {
    state = (state * MULTIPLIER) % MODULUS
    return (state - 1) / (MODULUS - 1)
  }
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

/** Adds the mouth `level` to every lip-sync parameter, within its range. */
export const applyLipSync = (
  document: PuppetDocument,
  values: PuppetParameterValueMap,
  level: number,
): PuppetParameterValueMap => {
  const ids = new Set(document.parameterRoles?.lipSync ?? [])
  return Object.fromEntries(
    Object.entries(values).map(([id, value]) => {
      const parameter = document.parameters?.find((candidate) => candidate.id === id)
      return [
        id,
        parameter === undefined || !ids.has(id)
          ? value
          : resolveParameterValue(parameter, value + level),
      ]
    }),
  )
}

/**
 * Adds each breath parameter's `(offset + peak · sin(2π · time / period)) · weight` to its value,
 * within its range; `time` is seconds since breathing started.
 */
export const applyBreath = (
  document: PuppetDocument,
  values: PuppetParameterValueMap,
  time: number,
): PuppetParameterValueMap => {
  const next = {...values}
  for (const breath of document.breath ?? []) {
    const parameter = document.parameters?.find((candidate) => candidate.id === breath.parameterId)
    if (parameter !== undefined) {
      const wave = breath.offset + breath.peak * Math.sin((2 * Math.PI * time) / breath.period)
      const current = values[parameter.id] ?? parameter.defaultValue
      next[parameter.id] = resolveParameterValue(parameter, current + wave * breath.weight)
    }
  }
  return next
}

/** A random motion of `group`, or `undefined` when the group has none. */
export const pickGroupMotion = (document: PuppetDocument, group: string, random: RandomSource) => {
  const motions = document.motions.filter((motion) => motion.group === group)
  return motions[Math.min(motions.length - 1, Math.floor(random() * motions.length))]
}
