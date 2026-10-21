import {expect, test} from 'vitest'
import {poffoTrackingOptionsSchema} from '../tracking'
import {resolveTrackingRange} from '../tracking-range'

test('should retain legacy symmetric limits and allow independent offset bounds', () => {
  expect(resolveTrackingRange({headLimitX: 8, headLimitY: 3})).toEqual({
    maxX: 8,
    maxY: 3,
    minX: -8,
    minY: -3,
  })
  const options = {headMaximumX: 8, headMaximumY: 12, headMinimumX: 2, headMinimumY: -4}
  expect(poffoTrackingOptionsSchema.parse(options)).toEqual(options)
  expect(resolveTrackingRange(options)).toEqual({maxX: 8, maxY: 12, minX: 2, minY: -4})
})
test('should reject crossed bounds and retain fractional eye bounds', () => {
  expect(poffoTrackingOptionsSchema.safeParse({headMaximumX: 2, headMinimumX: 8}).success).toBe(
    false,
  )
  expect(resolveTrackingRange({eyeMaximumX: 0.8, eyeMinimumX: -0.1}, 'eye')).toEqual({
    maxX: 0.8,
    maxY: 1,
    minX: -0.1,
    minY: -1,
  })
})
