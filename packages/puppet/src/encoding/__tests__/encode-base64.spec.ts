import {expect, test} from 'vitest'
import {encodeBase64} from '../encode-base64'

test.each([0, 1, 2, 3, 256, 24_575, 24_576, 24_577, 73_729])(
  'should encode all byte values and padding for a %i-byte subarray',
  (length) => {
    const storage = Uint8Array.from({length: length + 6}, (_, index) => index % 256)
    const bytes = storage.subarray(3, length + 3)
    expect(encodeBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
  },
)

test('should encode bytes on runtimes without a native Base64 encoder', () => {
  const bytes = Uint8Array.from({length: 73_729}, (_, index) => index % 256)
  Object.defineProperty(bytes, 'toBase64', {value: undefined})
  expect(encodeBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
})

test('should preserve the byte view when using a native encoder', () => {
  const bytes = Uint8Array.of(9, 1, 2, 3, 9).subarray(1, 4)
  Object.defineProperty(bytes, 'toBase64', {
    value: function encode(this: Uint8Array) {
      return Buffer.from(this).toString('base64')
    },
  })
  expect(encodeBase64(bytes)).toBe('AQID')
})
