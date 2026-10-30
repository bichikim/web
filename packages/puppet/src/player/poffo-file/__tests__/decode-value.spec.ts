/** @vitest-environment node */
import {expect, test} from 'vitest'
import {decodeValue} from '../decode-value'
import {encodeValue} from '../encode-value'

const encoded = (value: unknown) => new Uint8Array(Buffer.concat(encodeValue(value).parts))

test.each([
  [],
  [255],
  [4, 0, 0, 0, 0],
  [10, 0, 0, 0, 0],
  [9, 255, 255, 255, 255],
  [7, 255, 255, 255, 255],
  [5, 0, 0, 0],
  [3, 1, 0, 0, 0, 255],
])('should reject malformed or unbounded values %j', (...source) => {
  expect(() => decodeValue({assets: [], bytes: Uint8Array.from(source)})).toThrow(SyntaxError)
})

test('should reject trailing bytes instead of accepting a partial value', () => {
  expect(() => decodeValue({assets: [], bytes: Uint8Array.of(0, 0)})).toThrow(SyntaxError)
})

test('should reject truncation at every byte of a valid nested value', () => {
  const bytes = encoded({name: '고양이', positions: [0.1, 0.2], values: [true, null]})
  for (let length = 0; length < bytes.length; length += 1) {
    expect(() => decodeValue({assets: [], bytes: bytes.subarray(0, length)})).toThrow(SyntaxError)
  }
})

test('should reject non-finite encoded scalars', () => {
  const bytes = new Uint8Array(9)
  bytes[0] = 5
  new DataView(bytes.buffer).setFloat64(1, Infinity, true)
  expect(() => decodeValue({assets: [], bytes})).toThrow(SyntaxError)
})
