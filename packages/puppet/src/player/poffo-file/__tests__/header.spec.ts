/** @vitest-environment node */
import {expect, test} from 'vitest'
import {decodeHeader, encodeHeader} from '../header'

const header = {
  assetCount: 2,
  codec: 1 as const,
  decodedLength: 1024,
  encodedLength: 128,
  indexHash: new Uint8Array(32),
  indexLength: 256,
}

test('should write the documented little-endian versioned header', () => {
  const bytes = encodeHeader(header)
  expect(bytes.length).toBe(64)
  expect([...bytes.subarray(0, 8)]).toEqual([80, 79, 70, 70, 79, 13, 10, 26])
  expect(new DataView(bytes.buffer).getUint16(8, true)).toBe(1)
  expect(decodeHeader(bytes)).toEqual(header)
})

test.each([0, 1, 2, 7, 8, 12, 31, 63])('should reject a truncated %i-byte header', (length) => {
  expect(() => decodeHeader(encodeHeader(header).subarray(0, length))).toThrow(SyntaxError)
})

test.each([0, 8, 10, 16])(
  'should reject an unknown signature, version, flag or codec at offset %i',
  (offset) => {
    const bytes = encodeHeader(header)
    bytes[offset] = 255
    expect(() => decodeHeader(bytes)).toThrow(SyntaxError)
  },
)

test('should reject lengths that the v1 header cannot represent', () => {
  expect(() => encodeHeader({...header, decodedLength: 4294967296})).toThrow(RangeError)
})
