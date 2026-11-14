import {expect, test} from 'vitest'
import {decodeDataUrl} from '../decode-data-url'

test.each(['AQI=', 'AQI', 'AQ I='])('should decode supported Base64 spelling %s', (payload) => {
  const result = decodeDataUrl(`data:image/png;charset=utf-8;base64,${payload}`)
  expect(result?.prefix).toBe('data:image/png;charset=utf-8;base64,')
  expect(result?.bytes).toEqual(Uint8Array.of(1, 2))
})

test.each([
  'external.png',
  'data:image/svg+xml,%3Csvg%3E',
  'data:image/png;base64,%%',
  'data:image/png;base64,A',
])('should return undefined for unsupported or malformed input %s', (source) => {
  expect(decodeDataUrl(source)).toBeUndefined()
})

test('should retain an empty embedded payload and return independently owned bytes', () => {
  expect(decodeDataUrl('data:image/png;base64,')?.bytes).toEqual(new Uint8Array())
  const first = decodeDataUrl('data:image/png;base64,AQI=')!
  first.bytes[0] = 9
  expect(decodeDataUrl('data:image/png;base64,AQI=')?.bytes).toEqual(Uint8Array.of(1, 2))
})

test('should decode when native Base64 support is unavailable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Uint8Array, 'fromBase64')
  Object.defineProperty(Uint8Array, 'fromBase64', {configurable: true, value: undefined})
  try {
    expect(decodeDataUrl('data:image/png;base64,AQI')?.bytes).toEqual(Uint8Array.of(1, 2))
    expect(decodeDataUrl('data:image/png;base64,%%')).toBeUndefined()
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(Uint8Array, 'fromBase64')
    } else {
      Object.defineProperty(Uint8Array, 'fromBase64', descriptor)
    }
  }
})
