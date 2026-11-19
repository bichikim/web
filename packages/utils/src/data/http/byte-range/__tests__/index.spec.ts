/** @vitest-environment node */
import {describe, expect, expectTypeOf, it} from 'vitest'

import {type ByteRange, parseByteRange} from '..'

describe('parseByteRange', () => {
  it.each([
    ['bytes=0-2', 7, {end: 2, start: 0}],
    ['bytes=2-', 7, {end: 6, start: 2}],
    ['bytes=2-99', 7, {end: 6, start: 2}],
    ['bytes=-3', 7, {end: 6, start: 4}],
    ['bytes=-99', 7, {end: 6, start: 0}],
    ['bytes=0002-0004', 7, {end: 4, start: 2}],
    ['bytes=0-0', 1, {end: 0, start: 0}],
    ['bytes=0-9007199254740991', 7, {end: 6, start: 0}],
  ] as const)('should resolve %s against %i bytes', (value, contentLength, expected) => {
    const range = parseByteRange(value, contentLength)

    expect(range).toEqual(expected)
    expectTypeOf(range).toEqualTypeOf<ByteRange | null>()
  })

  it.each([
    '',
    'malformed',
    'items=0-2',
    'Bytes=0-2',
    'bytes= 0-2',
    'bytes=0-2 ',
    'bytes=0-0,2-2',
    'bytes=1.5-2',
    'bytes=-',
    'bytes=-0',
    'bytes=5-2',
    'bytes=7-',
    'bytes=9007199254740992-',
    'bytes=0-9007199254740992',
    'bytes=-9007199254740992',
  ])('should return null for the invalid or unsatisfiable %s range', (value) => {
    expect(parseByteRange(value, 7)).toBeNull()
  })

  it('should preserve the empty suffix span for a zero-length representation', () => {
    expect(parseByteRange('bytes=-1', 0)).toEqual({end: -1, start: 0})
    expect(parseByteRange('bytes=0-', 0)).toBeNull()
  })
})
