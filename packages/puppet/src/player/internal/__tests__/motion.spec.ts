import {describe, expect, test} from 'vitest'

import type {PuppetMotion} from '../../document'
import {applyMotionVertices, sampleMotionParameterValues, sampleMotionVertices} from '../motion'

const motion: PuppetMotion = {
  duration: 2,
  id: 'deform',
  tracks: [
    {
      axis: 'y',
      keyframes: [
        {time: 0, value: 10},
        {time: 1, value: 30},
        {time: 2, value: 10},
      ],
      kind: 'vertex',
      partId: 'animated',
      vertexIndex: 1,
    },
  ],
}

describe('applyMotionVertices', () => {
  test('should interpolate matching part coordinates into an existing buffer', () => {
    const vertices = new Float32Array([0, 0, 10, 10])

    applyMotionVertices({motion, partId: 'animated', time: 0.5, vertices})

    expect([...vertices]).toEqual([0, 0, 10, 20])
  })

  test('should apply easing from the first keyframe across its outgoing segment', () => {
    const vertices = new Float32Array([0, 0, 10, 10])
    const easedMotion: PuppetMotion = {
      ...motion,
      tracks: [
        {
          ...motion.tracks[0]!,
          keyframes: [
            {easing: 'ease-in', time: 0, value: 10},
            {time: 1, value: 30},
          ],
        },
      ],
    }

    applyMotionVertices({motion: easedMotion, partId: 'animated', time: 0.5, vertices})

    expect([...vertices]).toEqual([0, 0, 10, 12.5])
  })

  test('should leave unrelated parts and static motions unchanged', () => {
    const unrelatedVertices = [0, 0, 10, 10]
    const staticVertices = [0, 0, 10, 10]

    applyMotionVertices({motion, partId: 'static', time: 0.5, vertices: unrelatedVertices})
    applyMotionVertices({
      motion: undefined,
      partId: 'animated',
      time: 0.5,
      vertices: staticVertices,
    })

    expect(unrelatedVertices).toEqual([0, 0, 10, 10])
    expect(staticVertices).toEqual([0, 0, 10, 10])
  })
})

describe('sampleMotionVertices', () => {
  test('should return sampled display coordinates without mutating rest vertices', () => {
    const restVertices = [0, 0, 10, 10]

    const vertices = sampleMotionVertices({motion, partId: 'animated', restVertices, time: 1})

    expect(vertices).toEqual([0, 0, 10, 30])
    expect(restVertices).toEqual([0, 0, 10, 10])
  })
})

describe('sampleMotionParameterValues', () => {
  test('should interpolate each parameter track while preserving external values', () => {
    const parameterMotion: PuppetMotion = {
      duration: 2,
      id: 'parameters',
      tracks: [
        {
          keyframes: [
            {time: 0, value: -30},
            {time: 2, value: 30},
          ],
          kind: 'parameter',
          parameterId: 'angle-x',
        },
        {
          keyframes: [
            {time: 0, value: 10},
            {time: 2, value: -10},
          ],
          kind: 'parameter',
          parameterId: 'angle-y',
        },
      ],
    }

    const values = sampleMotionParameterValues({
      motion: parameterMotion,
      parameterValues: {'angle-x': 5, expression: 1},
      time: 1,
    })

    expect(values).toEqual({'angle-x': 0, 'angle-y': 0, expression: 1})
  })

  test('should preserve values when no motion is active', () => {
    const values = {'angle-x': 5}

    expect(
      sampleMotionParameterValues({motion: undefined, parameterValues: values, time: 1}),
    ).toEqual(values)
  })
})
