/** @vitest-environment node */
import {expect, it} from 'vitest'
import {writeTextBytes} from '..'

it('should write a tag relative to a bounded view without changing surrounding bytes', () => {
  const bytes = new Uint8Array(9).fill(204)

  writeTextBytes(new DataView(bytes.buffer, 2, 5), 1, 'RIFF')

  expect(Array.from(bytes)).toEqual([204, 204, 204, 82, 73, 70, 70, 204, 204])
})

it('should write the low byte of each UTF-16 code unit including surrogate pairs', () => {
  const bytes = new Uint8Array(5)

  writeTextBytes(new DataView(bytes.buffer), 0, '\u0000\u00ff\u0101😀')

  expect(Array.from(bytes)).toEqual([0, 255, 1, 61, 0])
})

it('should leave the view unchanged for empty text even with an invalid offset', () => {
  const bytes = Uint8Array.of(9)

  expect(writeTextBytes(new DataView(bytes.buffer), Number.POSITIVE_INFINITY, '')).toBeUndefined()

  expect(Array.from(bytes)).toEqual([9])
})

it('should retain the written prefix when the next byte exceeds the view', () => {
  const bytes = new Uint8Array(3).fill(9)

  expect(() => writeTextBytes(new DataView(bytes.buffer), 1, 'ABCD')).toThrow(RangeError)

  expect(Array.from(bytes)).toEqual([9, 65, 66])
})

it('should reject a negative index before writing any byte', () => {
  const bytes = new Uint8Array(3).fill(9)

  expect(() => writeTextBytes(new DataView(bytes.buffer), -1, 'AB')).toThrow(RangeError)

  expect(Array.from(bytes)).toEqual([9, 9, 9])
})

it.each([
  {expected: [9, 65, 66], offset: 1.5},
  {expected: [66, 9, 9], offset: Number.NaN},
])('should retain native per-byte index coercion for offset $offset', ({expected, offset}) => {
  const bytes = new Uint8Array(3).fill(9)

  writeTextBytes(new DataView(bytes.buffer), offset, 'AB')

  expect(Array.from(bytes)).toEqual(expected)
})
