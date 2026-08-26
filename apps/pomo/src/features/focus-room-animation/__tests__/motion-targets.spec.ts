import {describe, expect, it} from 'vitest'

import type {
  PixiSceneLoopingTranslation,
  PixiSceneMotion,
  PixiSceneTargetTranslation,
} from '../layer-scene-definition'
import {getMotionTarget, getNextMotionTarget} from '../motion-targets'

const motion = {
  kind: 'translation',
  targets: [
    {x: 0, y: 0},
    {x: -0.45, y: 0},
    {x: 0.45, y: 0},
    {x: 0, y: -0.225},
    {x: 0, y: 0.225},
  ],
  transitionSeconds: 0.04,
  travel: {maximumSeconds: 2.8, minimumSeconds: 1.6},
} satisfies PixiSceneTargetTranslation

describe('motion targets', () => {
  it('should select different gaze directions from the same position', () => {
    const currentTarget = motion.targets[0]

    expect(getNextMotionTarget(motion, currentTarget, 1, () => 0)).toEqual({x: -0.45, y: 0})
    expect(getNextMotionTarget(motion, currentTarget, 1, () => 0.99)).toEqual({x: 0, y: 0.225})
  })

  it('should not immediately select the current gaze position again', () => {
    const currentTarget = motion.targets[2]

    expect(getNextMotionTarget(motion, currentTarget, 1, () => 0.5)).not.toEqual(currentTarget)
  })

  it('should keep a looping translation moving toward its terminal point', () => {
    const loopingMotion = {
      from: {x: -20, y: 2},
      kind: 'looping-translation',
      to: {x: 30, y: -2},
      travel: {maximumSeconds: 30, minimumSeconds: 30},
    } satisfies PixiSceneLoopingTranslation

    expect(getNextMotionTarget(loopingMotion, loopingMotion.from, 1, () => 0.5)).toEqual(
      loopingMotion.to,
    )
  })

  it('should keep opacity pulses at the origin because they do not translate', () => {
    const opacityMotion = {
      kind: 'opacity-pulse',
      maximumOpacity: 0.8,
      minimumOpacity: 0.2,
      travel: {maximumSeconds: 8, minimumSeconds: 4},
    } satisfies PixiSceneMotion

    expect(getMotionTarget(opacityMotion, -1)).toEqual({x: 0, y: 0})
    expect(getNextMotionTarget(opacityMotion, {x: 0, y: 0}, 1, () => 0.5)).toEqual({x: 0, y: 0})
  })

  it('should resolve direct, reverse, and empty translation targets', () => {
    const loopingMotion = {
      from: {x: -2, y: -1},
      kind: 'looping-translation',
      to: {x: 2, y: 1},
      travel: {maximumSeconds: 1, minimumSeconds: 1},
    } satisfies PixiSceneLoopingTranslation
    const distanceMotion = {
      distance: {x: 4, y: 5},
      kind: 'translation',
      travel: {maximumSeconds: 1, minimumSeconds: 1},
    } satisfies PixiSceneMotion
    const emptyMotion = {...motion, targets: []}

    expect(getMotionTarget(loopingMotion, -1)).toEqual(loopingMotion.from)
    expect(getMotionTarget(loopingMotion, 1)).toEqual(loopingMotion.to)
    expect(getMotionTarget(distanceMotion, -1)).toEqual({x: 0, y: 0})
    expect(getMotionTarget(distanceMotion, 1)).toEqual(distanceMotion.distance)
    expect(getMotionTarget(emptyMotion, 1)).toEqual({x: 0, y: 0})
    expect(getNextMotionTarget(emptyMotion, {x: 0, y: 0}, 1, () => 0.5)).toBeUndefined()
  })
})
