import {expect, test} from 'vitest'
import {trimCubismKeyframes} from '../trim-cubism-keyframes'
import {sampleKeyframes} from '../../player/internal/motion'
import type {PuppetKeyframe} from '../../player/document'

test('should preserve a clipped Bezier curve without changing the declared motion duration', () => {
  const keys: ReadonlyArray<PuppetKeyframe> = [
    {bezier: [0.2, 10, 0.8, -3], easing: 'bezier', time: 0, value: 1},
    {time: 1.003, value: 2},
  ]
  const clipped = trimCubismKeyframes(keys, 1)
  expect(clipped.at(-1)!.time).toBe(1)
  for (const time of [0, 0.1, 0.5, 0.9, 1]) {
    expect(sampleKeyframes(clipped, time)).toBeCloseTo(sampleKeyframes(keys, time), 8)
  }
})
