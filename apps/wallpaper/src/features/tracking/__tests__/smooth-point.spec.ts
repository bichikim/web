import {expect, test} from 'vitest'
import {smoothTrackingPoint} from '../smooth-point'

test('should smooth without overshooting and produce the same result across frame rates', () => {
  const start = {x: 0, y: 0}
  const target = {x: 1, y: -1}
  const single = smoothTrackingPoint(start, target, 0.08)
  const split = smoothTrackingPoint(smoothTrackingPoint(start, target, 0.04), target, 0.04)
  expect(single.x).toBeGreaterThan(0)
  expect(single.x).toBeLessThan(1)
  expect(split.x).toBeCloseTo(single.x)
  expect(split.y).toBeCloseTo(single.y)
  expect(smoothTrackingPoint(start, target, -1)).toEqual(start)
})
