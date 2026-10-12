/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import type {PixiSceneOpacityTwinkle} from '../features/focus-room-animation/layer-scene-definition'
import {
  advanceOpacityTwinkle,
  createOpacityTwinkleState,
} from '../features/focus-room-animation/opacity-twinkle'

const motion = {
  fall: {maximumSeconds: 0.6, minimumSeconds: 0.25},
  flashChance: 0.06,
  flashFall: {maximumSeconds: 0.32, minimumSeconds: 0.12},
  flashHold: {maximumSeconds: 0.12, minimumSeconds: 0.04},
  flashRise: {maximumSeconds: 0.14, minimumSeconds: 0.05},
  kind: 'opacity-twinkle',
  maximumOpacity: 1,
  minimumOpacity: 0,
  rise: {maximumSeconds: 0.25, minimumSeconds: 0.1},
  travel: {maximumSeconds: 6, minimumSeconds: 1.5},
} satisfies PixiSceneOpacityTwinkle

const createRandom = (values: readonly number[]) => {
  let index = 0

  return () => {
    const value = values[index] ?? 0
    index += 1
    return value
  }
}

describe('opacity twinkle mid-transition easing', () => {
  it('should ease opacity partway through a rise transition instead of holding the start value', () => {
    const state = createOpacityTwinkleState(motion, createRandom([0, 0]))
    const random = createRandom([0.6, 0.5, 0.5])

    advanceOpacityTwinkle(state, motion, 1.5, random)

    expect(state.phase).toBe('transitioning')
    const {fromOpacity, targetOpacity, durationSeconds} = state
    expect(targetOpacity).toBeGreaterThan(fromOpacity)

    const midOpacity = advanceOpacityTwinkle(state, motion, durationSeconds / 2, random)

    expect(midOpacity).toBeGreaterThan(fromOpacity)
    expect(midOpacity).toBeLessThan(targetOpacity)
  })
})
