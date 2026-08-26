import type {Container} from 'pixi.js'

import type {PixiSceneOpacityTwinkle, PixiSceneTravelRange} from './layer-scene-definition'

export interface OpacityTwinkleState {
  currentOpacity: number
  durationSeconds: number
  elapsedSeconds: number
  flashActive: boolean
  fromOpacity: number
  phase: 'flash-holding' | 'holding' | 'transitioning'
  targetOpacity: number
}

interface AdvanceSpriteOpacityTwinkleOptions {
  readonly deltaSeconds: number
  readonly motion: PixiSceneOpacityTwinkle
  readonly random: () => number
  readonly sprite: Container
  readonly state: OpacityTwinkleState | undefined
}

const INITIAL_BRIGHTNESS_FRACTION = 0.4
const DIM_TARGET_CHANCE = 0.5
const DIM_TARGET_MAXIMUM = 0.15
const MEDIUM_TARGET_MINIMUM = 0.3
const MEDIUM_TARGET_RANGE = 0.3
const BRIGHT_TARGET_MINIMUM = 0.8
const BRIGHT_TARGET_RANGE = 0.2

const randomRange = (range: PixiSceneTravelRange, random: () => number) =>
  range.minimumSeconds + random() * (range.maximumSeconds - range.minimumSeconds)

const interpolateOpacity = (motion: PixiSceneOpacityTwinkle, fraction: number) =>
  motion.minimumOpacity + (motion.maximumOpacity - motion.minimumOpacity) * fraction

const selectTarget = (motion: PixiSceneOpacityTwinkle, random: () => number) => {
  const targetBand = random()
  let targetFraction: number
  let flashActive = false

  if (targetBand < DIM_TARGET_CHANCE) {
    targetFraction = random() * DIM_TARGET_MAXIMUM
  } else if (targetBand < 1 - motion.flashChance) {
    targetFraction = MEDIUM_TARGET_MINIMUM + random() * MEDIUM_TARGET_RANGE
  } else {
    targetFraction = BRIGHT_TARGET_MINIMUM + random() * BRIGHT_TARGET_RANGE
    flashActive = true
  }

  return {flashActive, opacity: interpolateOpacity(motion, targetFraction)}
}

export const createOpacityTwinkleState = (
  motion: PixiSceneOpacityTwinkle,
  random: () => number,
): OpacityTwinkleState => {
  const currentOpacity = interpolateOpacity(motion, random() * INITIAL_BRIGHTNESS_FRACTION)

  return {
    currentOpacity,
    durationSeconds: randomRange(motion.travel, random),
    elapsedSeconds: 0,
    flashActive: false,
    fromOpacity: currentOpacity,
    phase: 'holding',
    targetOpacity: currentOpacity,
  }
}

export const advanceOpacityTwinkle = (
  state: OpacityTwinkleState,
  motion: PixiSceneOpacityTwinkle,
  deltaSeconds: number,
  random: () => number,
) => {
  state.elapsedSeconds += deltaSeconds

  if (state.elapsedSeconds < state.durationSeconds) {
    return state.currentOpacity
  }

  if (state.phase === 'flash-holding') {
    state.elapsedSeconds -= state.durationSeconds
    state.flashActive = false
    state.fromOpacity = state.currentOpacity
    state.targetOpacity = interpolateOpacity(motion, random() * DIM_TARGET_MAXIMUM)
    state.durationSeconds = randomRange(motion.flashFall, random)
    state.phase = 'transitioning'
  }

  if (state.phase === 'holding') {
    state.elapsedSeconds -= state.durationSeconds
    state.fromOpacity = state.currentOpacity
    const target = selectTarget(motion, random)
    state.flashActive = target.flashActive
    state.targetOpacity = target.opacity
    state.durationSeconds = randomRange(
      state.flashActive
        ? motion.flashRise
        : state.targetOpacity > state.currentOpacity
          ? motion.rise
          : motion.fall,
      random,
    )
    state.phase = 'transitioning'
  }

  const progress = Math.min(1, state.elapsedSeconds / state.durationSeconds)
  const easedProgress = (1 - Math.cos(progress * Math.PI)) / 2
  state.currentOpacity =
    state.fromOpacity + (state.targetOpacity - state.fromOpacity) * easedProgress

  if (progress === 1) {
    state.currentOpacity = state.targetOpacity
    state.durationSeconds = randomRange(
      state.flashActive ? motion.flashHold : motion.travel,
      random,
    )
    state.elapsedSeconds = 0
    state.phase = state.flashActive ? 'flash-holding' : 'holding'
  }

  return state.currentOpacity
}

export const applyOpacityTwinkle = (sprite: Container, state: OpacityTwinkleState) => {
  sprite.alpha = state.currentOpacity
}

export const advanceSpriteOpacityTwinkle = (options: AdvanceSpriteOpacityTwinkleOptions) => {
  const {deltaSeconds, motion, random, sprite, state} = options

  if (state === undefined) {
    throw new Error('Missing opacity twinkle state')
  }

  advanceOpacityTwinkle(state, motion, deltaSeconds, random)
  applyOpacityTwinkle(sprite, state)
}
