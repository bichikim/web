import type {Sprite} from 'pixi.js'
import {describe, expect, it} from 'vitest'

import type {PixiSceneOpacityTwinkle} from '../layer-scene-definition'
import {
  advanceOpacityTwinkle,
  advanceSpriteOpacityTwinkle,
  createOpacityTwinkleState,
} from '../opacity-twinkle'

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

describe('opacity twinkle', () => {
  it('should start each star at an independently randomized dim brightness', () => {
    const state = createOpacityTwinkleState(motion, createRandom([0.5, 0.5]))

    expect(state).toMatchObject({
      currentOpacity: 0.2,
      durationSeconds: 3.75,
      phase: 'holding',
    })
  })

  it('should render rare flashes with a rapid rise, short hold, and rapid fall', () => {
    const random = createRandom([0, 0, 0.97, 0.5, 0.5, 0.5, 0.5, 0.5])
    const state = createOpacityTwinkleState(motion, random)

    advanceOpacityTwinkle(state, motion, 1.5, random)

    expect(state).toMatchObject({
      durationSeconds: 0.095,
      flashActive: true,
      fromOpacity: 0,
      phase: 'transitioning',
      targetOpacity: 0.9,
    })

    expect(advanceOpacityTwinkle(state, motion, 0.095, random)).toBeCloseTo(0.9)
    expect(state.phase).toBe('flash-holding')

    advanceOpacityTwinkle(state, motion, 0.08, random)

    expect(state).toMatchObject({
      durationSeconds: 0.22,
      flashActive: false,
      fromOpacity: 0.9,
      phase: 'transitioning',
      targetOpacity: 0.075,
    })
  })

  it('should keep dim and medium targets more common than peak flashes', () => {
    const dimRandom = createRandom([0.2, 0.5])
    const mediumRandom = createRandom([0.6, 0.5])
    const brightRandom = createRandom([0.97, 0.5])
    const dimState = createOpacityTwinkleState(motion, createRandom([0, 0]))
    const mediumState = createOpacityTwinkleState(motion, createRandom([0, 0]))
    const brightState = createOpacityTwinkleState(motion, createRandom([0, 0]))

    advanceOpacityTwinkle(dimState, motion, 1.5, dimRandom)
    advanceOpacityTwinkle(mediumState, motion, 1.5, mediumRandom)
    advanceOpacityTwinkle(brightState, motion, 1.5, brightRandom)

    expect(dimState.targetOpacity).toBeCloseTo(0.075)
    expect(mediumState.targetOpacity).toBeCloseTo(0.45)
    expect(brightState.targetOpacity).toBeCloseTo(0.9)
  })

  it('should preserve opacity during a hold and apply it through the sprite adapter', () => {
    const random = createRandom([0.5, 0.5])
    const state = createOpacityTwinkleState(motion, random)
    const sprite = {alpha: -1} as unknown as Sprite

    advanceSpriteOpacityTwinkle({deltaSeconds: 1, motion, random, sprite, state})

    expect(state.elapsedSeconds).toBe(1)
    expect(sprite.alpha).toBe(state.currentOpacity)
    expect(() =>
      advanceSpriteOpacityTwinkle({
        deltaSeconds: 1,
        motion,
        random,
        sprite,
        state: undefined,
      }),
    ).toThrow('Missing opacity twinkle state')
  })

  it('should fall to a dim non-flash target and return to a randomized travel hold', () => {
    const state = createOpacityTwinkleState(motion, createRandom([1, 0]))
    const random = createRandom([0, 0, 0, 0.5])

    advanceOpacityTwinkle(state, motion, 1.5, random)

    expect(state).toMatchObject({
      durationSeconds: motion.fall.minimumSeconds,
      flashActive: false,
      fromOpacity: 0.4,
      phase: 'transitioning',
      targetOpacity: 0,
    })

    expect(advanceOpacityTwinkle(state, motion, motion.fall.minimumSeconds, random)).toBe(0)
    expect(state).toMatchObject({
      durationSeconds: 3.75,
      elapsedSeconds: 0,
      phase: 'holding',
    })
  })
})
