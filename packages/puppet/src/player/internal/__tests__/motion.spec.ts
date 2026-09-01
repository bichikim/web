import {describe, expect, test} from 'vitest'

import type {PuppetMotion} from '../../document'
import {applyMotionVertices, sampleMotionVertices} from '../motion'

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
