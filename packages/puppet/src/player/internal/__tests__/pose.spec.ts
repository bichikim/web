import {describe, expect, test} from 'vitest'

import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetPoseGroup,
} from '../../document'
import {evaluatePose, isPoseFading, selectPoseEntry} from '../pose'

const arms: PuppetPoseGroup = {
  entries: [
    {partIds: ['arm-down'], value: 0},
    {partIds: ['arm-up', 'hand-up'], value: 1},
  ],
  fadeTime: 0.5,
  id: 'arms',
  parameterId: 'arm-pose',
}

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [{defaultValue: 0, id: 'arm-pose', maximum: 1, minimum: 0, name: 'Arm pose'}],
  parts: [],
  poseGroups: [arms],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
}

describe('evaluatePose', () => {
  test('should select the nearest entry and settle without fading', () => {
    expect(selectPoseEntry(arms, 0.4)).toBe(0)
    expect(selectPoseEntry(arms, 0.6)).toBe(1)
    expect(selectPoseEntry(arms, 0.5)).toBe(0)

    const settled = evaluatePose({
      deltaTime: 0,
      document,
      parameterValues: {'arm-pose': 1},
      poseState: new Map(),
      settle: true,
    })
    expect(Object.fromEntries(settled.opacityByPartId)).toEqual({
      'arm-down': 0,
      'arm-up': 1,
      'hand-up': 1,
    })
    expect(isPoseFading(settled.poseState)).toBe(false)
  })

  test('should cross-fade over the group fade time when the selection changes', () => {
    const start = evaluatePose({
      deltaTime: 0,
      document,
      parameterValues: {},
      poseState: new Map(),
      settle: true,
    })
    const halfway = evaluatePose({
      deltaTime: 0.25,
      document,
      parameterValues: {'arm-pose': 1},
      poseState: start.poseState,
    })
    expect(halfway.poseState.get('arms')).toEqual([0.5, 0.5])
    expect(isPoseFading(halfway.poseState)).toBe(true)

    const done = evaluatePose({
      deltaTime: 0.25,
      document,
      parameterValues: {'arm-pose': 1},
      poseState: halfway.poseState,
    })
    expect(done.poseState.get('arms')).toEqual([0, 1])
  })
})
