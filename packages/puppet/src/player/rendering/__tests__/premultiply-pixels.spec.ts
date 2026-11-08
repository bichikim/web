import {expect, test} from 'vitest'
import {premultiplyPixels} from '../premultiply-pixels'

test('should convert straight RGBA bytes without changing the input', () => {
  const input = Uint8ClampedArray.of(255, 127, 1, 128, 17, 23, 201, 0, 17, 23, 201, 255)
  const original = input.slice()
  expect(premultiplyPixels(input)).toEqual(
    Uint8Array.of(128, 64, 1, 128, 0, 0, 0, 0, 17, 23, 201, 255),
  )
  expect(input).toEqual(original)
})

test('should round low alpha color channels to the nearest byte', () => {
  expect(premultiplyPixels(Uint8ClampedArray.of(127, 128, 255, 1))).toEqual(
    Uint8Array.of(0, 1, 1, 1),
  )
})

test('should accept an empty pixel buffer and reject incomplete RGBA pixels', () => {
  expect(premultiplyPixels(new Uint8ClampedArray())).toEqual(new Uint8Array())
  expect(() => premultiplyPixels(Uint8ClampedArray.of(1, 2, 3))).toThrow(RangeError)
})
