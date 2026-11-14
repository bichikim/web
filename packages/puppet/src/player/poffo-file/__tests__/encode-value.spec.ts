/** @vitest-environment node */
import {expect, test} from 'vitest'
import {encodeValue} from '../encode-value'
import {decodeValue} from '../decode-value'

const restore = (source: unknown) => {
  const encoded = encodeValue(source)
  return decodeValue({
    assets: encoded.assets.map(
      (asset) => asset.prefix + Buffer.from(asset.bytes).toString('base64'),
    ),
    bytes: new Uint8Array(Buffer.concat(encoded.parts)),
  })
}

test('should roundtrip nested values, Unicode, escaped strings and repeated keys', () => {
  const source = {
    escaped: '\ud800\uFEFF\u0000',
    items: [null, true, false, {name: '고양이🐈'}],
    name: '고양이🐈',
    optional: undefined,
  }
  expect(restore(source)).toEqual({escaped: source.escaped, items: source.items, name: source.name})
})

test.each([
  [0, 255],
  [0, 256, 65535],
  [65536, 4294967295],
  [-2147483648, 2147483647],
  [0.5, -0, Math.fround(0.1)],
  [0.1, Number.MIN_VALUE, Number.MAX_VALUE],
])('should preserve every numeric array element exactly: %j', (...values) => {
  const actual = restore(values) as number[]
  values.forEach((value, index) => expect(Object.is(actual[index], value)).toBe(true))
})

test('should preserve scalar negative zero and integer precision boundaries', () => {
  const source = [-0, 9007199254740991, 9007199254740992, 0.1].map((value) => ({value}))
  const actual = restore(source) as typeof source
  source.forEach(({value}, index) => expect(Object.is(actual[index]!.value, value)).toBe(true))
})

test('should store canonical image and audio bytes once without changing their data URLs', () => {
  const image = 'data:image/png;base64,AAECAw=='
  const source = [
    image,
    image,
    'data:audio/wav;name=a.wav;base64,BAUG',
    'data:image/png;base64,AA EC Aw==',
  ]
  const encoded = encodeValue(source)
  expect(encoded.assets).toHaveLength(2)
  expect([...encoded.assets[0]!.bytes]).toEqual([0, 1, 2, 3])
  expect(restore(source)).toEqual(source)
})

test('should roundtrip own prototype-like keys without changing object prototypes', () => {
  const source = JSON.parse('{"__proto__":{"polluted":true},"constructor":"value"}')
  const actual = restore(source) as Record<string, unknown>
  expect(Object.hasOwn(actual, '__proto__')).toBe(true)
  expect(Object.getPrototypeOf(actual)).toBe(Object.prototype)
  expect(actual).toEqual(source)
})

test.each([Number.NaN, Infinity, -Infinity, 1n])(
  'should reject unsupported numeric values %s',
  (value) => {
    expect(() => encodeValue({value})).toThrow(TypeError)
  },
)

test('should reject cyclic input without rejecting shared objects', () => {
  const shared = {value: 1}
  expect(restore([shared, shared])).toEqual([shared, shared])
  const cyclic: unknown[] = []
  cyclic.push(cyclic)
  expect(() => encodeValue(cyclic)).toThrow(TypeError)
})

test('should preserve values across output chunk boundaries and oversized strings', () => {
  const source = {
    large: 'y'.repeat(1_048_580),
    padding: 'x'.repeat(1_048_551),
    positions: Array.from({length: 16}, (_, index) => index + 0.1),
  }
  expect(restore(source)).toEqual(source)
})
