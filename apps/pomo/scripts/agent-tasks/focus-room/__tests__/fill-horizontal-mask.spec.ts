/** @vitest-environment node */
import {expect, it} from 'vitest'
import {fillHorizontalMask} from '../fill-horizontal-mask.mjs'

const rgba = (values: readonly number[], alpha: readonly number[] = []) =>
  Buffer.from(values.flatMap((value, index) => [value, value, value, alpha[index] ?? 255]))

const options = (width: number, height = 1, sampleRadius = 18) => ({
  dimensions: {height, width},
  edgeThreshold: 16,
  sampleRadius,
})

it('should return a fresh empty buffer for an empty raster', () => {
  const source = Buffer.alloc(0)
  const result = fillHorizontalMask(source, [], options(0, 0))

  expect(result).toEqual(source)
  expect(result).not.toBe(source)
})

it('should copy an unmasked raster without modifying either caller buffer', () => {
  const source = rgba([10, 20, 30], [0, 100, 255])
  const mask = Buffer.from([0, 16, 0])
  const before = Buffer.from(source)
  const result = fillHorizontalMask(source, mask, options(3))

  expect(result).toEqual(before)
  expect(result).not.toBe(source)
  expect(source).toEqual(before)
  expect(mask).toEqual(Buffer.from([0, 16, 0]))
})

it('should fill an entire run from its brightest left sample and retain alpha', () => {
  const source = rgba([20, 90, 1, 2, 50], [255, 255, 12, 0, 255])
  const result = fillHorizontalMask(source, [0, 0, 255, 255, 0], options(5))

  expect(result).toEqual(rgba([20, 90, 90, 90, 50], [255, 255, 12, 0, 255]))
  expect(source).toEqual(rgba([20, 90, 1, 2, 50], [255, 255, 12, 0, 255]))
})

it('should use a brighter right sample for the complete masked run', () => {
  const result = fillHorizontalMask(rgba([90, 1, 2, 100, 0]), [0, 255, 255, 0, 0], options(5))

  expect(result).toEqual(rgba([90, 100, 100, 100, 0]))
})

it('should select samples by weighted RGB brightness rather than channel sum', () => {
  const source = Buffer.from([30, 0, 0, 255, 1, 1, 1, 77, 0, 10, 0, 255])
  const result = fillHorizontalMask(source, [0, 255, 0], options(3))

  expect(result).toEqual(Buffer.from([30, 0, 0, 255, 0, 10, 0, 77, 0, 10, 0, 255]))
})

it('should prefer the left side when different colors have exactly equal brightness', () => {
  const source = Buffer.from([31, 3, 0, 255, 1, 1, 1, 77, 0, 0, 121, 255])
  const result = fillHorizontalMask(source, [0, 255, 0], options(3))

  expect(result).toEqual(Buffer.from([31, 3, 0, 255, 31, 3, 0, 77, 0, 0, 121, 255]))
})

it('should keep the nearest sample within a direction when brightness ties', () => {
  const source = Buffer.from([31, 3, 0, 255, 0, 0, 121, 255, 1, 1, 1, 77, 0, 0, 0, 0])
  const result = fillHorizontalMask(source, [0, 0, 255, 0], options(4))

  expect(result).toEqual(Buffer.from([31, 3, 0, 255, 0, 0, 121, 255, 0, 0, 121, 77, 0, 0, 0, 0]))
})

it('should skip fully transparent candidates while accepting nonzero alpha', () => {
  const result = fillHorizontalMask(
    rgba([255, 80, 1, 40], [0, 1, 17, 255]),
    [0, 0, 255, 0],
    options(4),
  )

  expect(result).toEqual(rgba([255, 80, 80, 40], [0, 1, 17, 255]))
})

it('should use a mask value at the threshold as a sample and fill only values above it', () => {
  const result = fillHorizontalMask(rgba([90, 1, 20]), [16, 17, 0], options(3))

  expect(result).toEqual(rgba([90, 90, 20]))
})

it('should respect the exclusive sample radius measured from the immediate neighbor', () => {
  const source = rgba([200, 10, 1, 2])
  const mask = [0, 0, 255, 255]
  const near = fillHorizontalMask(source, mask, options(4, 1, 1))
  const farther = fillHorizontalMask(source, mask, options(4, 1, 2))

  expect(near).toEqual(rgba([200, 10, 10, 10]))
  expect(farther).toEqual(rgba([200, 10, 200, 200]))
})

it('should retain masked values when the sample radius is zero', () => {
  const source = rgba([90, 1, 100])

  expect(fillHorizontalMask(source, [0, 255, 0], options(3, 1, 0))).toEqual(source)
})

it('should fill a run touching the left edge using only right-side candidates', () => {
  const result = fillHorizontalMask(rgba([1, 2, 70]), [255, 255, 0], options(3))

  expect(result).toEqual(rgba([70, 70, 70]))
})

it('should retain a fully masked row when no candidate exists on either side', () => {
  const source = rgba([10, 20, 30])

  expect(fillHorizontalMask(source, [255, 255, 255], options(3))).toEqual(source)
})

it('should continue past masked candidate pixels within the sampling radius', () => {
  const result = fillHorizontalMask(rgba([200, 250, 1, 100, 2]), [0, 255, 255, 0, 255], options(5))

  expect(result).toEqual(rgba([200, 200, 200, 100, 200]))
})

it('should keep sample searches within their own row', () => {
  const result = fillHorizontalMask(
    rgba([10, 1, 20, 200, 1, 50]),
    [0, 255, 0, 0, 255, 0],
    options(3, 2),
  )

  expect(result).toEqual(rgba([10, 20, 20, 200, 200, 50]))
})

it('should propagate an indexed mask failure with its original identity', () => {
  const failure = new Error('mask unavailable')
  const mask = {
    get 0(): number {
      throw failure
    },
    length: 1,
  }
  let caught: unknown
  try {
    fillHorizontalMask(rgba([10]), mask, options(1))
  } catch (error: unknown) {
    caught = error
  }

  expect(caught).toBe(failure)
})
