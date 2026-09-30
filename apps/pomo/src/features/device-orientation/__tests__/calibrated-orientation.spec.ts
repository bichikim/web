/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getCalibratedOrientation} from '../calibrated-orientation'

it('should establish a baseline and report movement relative to it', () => {
  const first = getCalibratedOrientation(3, 5, 0, null)
  expect(first?.delta).toEqual({x: 0, y: 0})

  const moved = getCalibratedOrientation(7, 11, 0, first?.reference ?? null)
  expect(moved?.delta).toEqual({x: 6, y: 4})
  expect(moved?.reference).toEqual(first?.reference)
})

it('should reset the baseline when the screen rotates', () => {
  const first = getCalibratedOrientation(3, 5, 0, null)
  const rotated = getCalibratedOrientation(7, 11, 90, first?.reference ?? null)

  expect(rotated?.delta).toEqual({x: 0, y: 0})
  expect(rotated?.reference).toEqual({angle: 90, axes: {x: 7, y: -11}})
})

it('should ignore incomplete sensor samples without changing calibration', () => {
  expect(getCalibratedOrientation(null, 5, 0, null)).toBeNull()
  expect(getCalibratedOrientation(3, null, 0, null)).toBeNull()
})
