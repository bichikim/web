import {expect, test} from 'vitest'
import {smoothTrackingPoint} from '@winter-love/wallpaper/tracking/smooth-point'

test('should apply follow speed after bounding frame time and retain the target without overshooting', () => {
  const start = {x: 0, y: 0}
  const target = {x: 1, y: -1}
  const normal = smoothTrackingPoint(start, target, 0.1)
  const fast = smoothTrackingPoint(start, target, 0.1, 2)
  expect(fast.x).toBeGreaterThan(normal.x)
  expect(fast.x).toBeLessThanOrEqual(1)
  expect(fast.y).toBeGreaterThanOrEqual(-1)
  expect(smoothTrackingPoint(start, target, 0.05, 2)).toEqual(normal)
})

test('should finish on the exact target rather than stopping just short of the maximum', () => {
  const target = {x: 1, y: -1}
  let current = {x: 0, y: 0}
  for (let frame = 0; frame < 120; frame += 1) {
    current = smoothTrackingPoint(current, target, 1 / 60)
  }
  expect(current).toEqual(target)
  const close = {x: 0.9999, y: -0.9999}
  expect(smoothTrackingPoint(close, target, 0)).toEqual(close)
})

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
