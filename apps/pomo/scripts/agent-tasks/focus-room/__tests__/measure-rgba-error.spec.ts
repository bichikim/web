/** @vitest-environment node */
import {expect, it} from 'vitest'
import {measureRgbaError} from '../measure-rgba-error.mjs'

it('should report no compared colors for empty images', () => {
  expect(measureRgbaError({data: new Uint8Array()}, {data: new Uint8Array()})).toEqual({
    absoluteError: 0,
    comparedValues: 0,
    squaredError: 0,
  })
})

it('should ignore hidden colors when both alpha values are zero', () => {
  const source = {data: new Uint8Array([10, 20, 30, 0])}
  const output = {data: new Uint8Array([90, 80, 70, 0])}

  expect(measureRgbaError(source, output)).toEqual({
    absoluteError: 0,
    comparedValues: 0,
    squaredError: 0,
  })
})

it('should count each visible color even when the images match', () => {
  const source = {data: new Uint8Array([10, 20, 30, 255])}

  expect(measureRgbaError(source, source)).toEqual({
    absoluteError: 0,
    comparedValues: 3,
    squaredError: 0,
  })
})

it('should accumulate absolute and squared errors for opaque colors', () => {
  const source = {data: new Uint8Array([10, 20, 30, 255])}
  const output = {data: new Uint8Array([13, 16, 35, 255])}

  expect(measureRgbaError(source, output)).toEqual({
    absoluteError: 12,
    comparedValues: 3,
    squaredError: 50,
  })
})

it('should weight partial-alpha differences before accumulating errors', () => {
  const source = {data: new Uint8Array([0, 10, 20, 128])}
  const output = {data: new Uint8Array([5, 6, 22, 128])}
  const result = measureRgbaError(source, output)

  expect(result?.comparedValues).toBe(3)
  expect(result?.absoluteError).toBeCloseTo(5.52156862745098, 12)
  expect(result?.squaredError).toBeCloseTo(11.33840830449827, 12)
})

it('should include barely visible colors and exclude fully transparent pixels', () => {
  const source = {data: new Uint8Array([42, 80, 10, 0, 0, 0, 0, 1])}
  const output = {data: new Uint8Array([90, 70, 55, 0, 255, 255, 255, 1])}

  expect(measureRgbaError(source, output)).toEqual({
    absoluteError: 3,
    comparedValues: 3,
    squaredError: 3,
  })
})

it.each([0, 128, 255])('should reject a changed alpha value of %s', (alpha) => {
  const source = {data: new Uint8Array([0, 0, 0, alpha])}
  const output = {data: new Uint8Array([0, 0, 0, alpha === 255 ? 254 : alpha + 1])}

  expect(measureRgbaError(source, output)).toBeNull()
})

it('should discard earlier color errors when a later alpha differs', () => {
  const source = {data: new Uint8Array([0, 0, 0, 255, 10, 20, 30, 0])}
  const output = {data: new Uint8Array([1, 2, 3, 255, 10, 20, 30, 1])}

  expect(measureRgbaError(source, output)).toBeNull()
})

it('should preserve image data getter reads in pixel and channel order', () => {
  const reads: string[] = []
  const bytes = new Uint8Array([10, 20, 30, 255])
  const source = {
    get data() {
      reads.push('source')
      return bytes
    },
  }
  const output = {
    get data() {
      reads.push('output')
      return bytes
    },
  }

  measureRgbaError(source, output)

  expect(reads).toEqual([
    'source',
    'source',
    'output',
    'source',
    'output',
    'source',
    'output',
    'source',
    'output',
    'source',
  ])
})

it('should propagate a data getter failure without changing its identity', () => {
  const failure = new Error('data unavailable')
  const source = {
    get data(): Uint8Array {
      throw failure
    },
  }
  let caught: unknown
  try {
    measureRgbaError(source, {data: new Uint8Array()})
  } catch (error: unknown) {
    caught = error
  }

  expect(caught).toBe(failure)
})

it('should leave both caller-owned pixel buffers unchanged', () => {
  const source = new Uint8Array([10, 20, 30, 255])
  const output = new Uint8Array([13, 16, 35, 255])

  measureRgbaError({data: source}, {data: output})

  expect(source).toEqual(new Uint8Array([10, 20, 30, 255]))
  expect(output).toEqual(new Uint8Array([13, 16, 35, 255]))
})
