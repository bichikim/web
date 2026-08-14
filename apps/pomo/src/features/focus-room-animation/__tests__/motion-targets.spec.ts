import {describe, expect, it} from 'vitest'

import type {PixiSceneTargetTranslation} from '../layer-scene-definition'
import {getNextMotionTarget} from '../motion-targets'

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
})
