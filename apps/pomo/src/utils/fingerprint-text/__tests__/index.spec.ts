import {expect, it} from 'vitest'

import {fingerprintText} from '..'

it.each([
  ['', '0-0'],
  ['a', '2p-2p'],
  ['abc', '22ci-2xc6'],
  ['ABC', '1dtu-1yli'],
  [' abc', 'mhxe-11o12'],
  ['abc ', '1s0se-309j2'],
  ['가나다', 'q1yz0-10wu70'],
  ['😀', '2r5s-2r5s'],
  ['😀😀', '2g54w-2wo3k'],
  ['a😀b', '2fdz7-2wrh7'],
  ['\ud800\udc00', '1ekg-1ekg'],
  ['\ud800', '16o0-16o0'],
  ['\udc00', '17gg-17gg'],
  ['\ud800x', '10qrc-17urc'],
  ['x\udc00', '1abs-1avs'],
  ['e\u0301', '30c-3h6'],
  ['é', '6h-6h'],
  ['\n', 'a-a'],
  ['a\u0000', '2bj-2rp'],
])('should preserve the exact code-point fingerprint for %j', (text, expected) => {
  expect(fingerprintText(text)).toBe(expected)
})

it('should preserve modular accumulation for long BMP and astral input', () => {
  expect(fingerprintText('x'.repeat(10000))).toBe('9qm2sb-udpe8j')
  expect(fingerprintText('😀가'.repeat(10000))).toBe('emem92-3xcg17')
})

it('should remain deterministic across intervening calls without shared state', () => {
  const text = 'abc'
  expect(fingerprintText(text)).toBe('22ci-2xc6')
  expect(fingerprintText('😀')).toBe('2r5s-2r5s')
  expect(fingerprintText(text)).toBe('22ci-2xc6')
  expect(text).toBe('abc')
})

it('should preserve known collisions rather than imply unique or cryptographic identities', () => {
  expect(fingerprintText('')).toBe('0-0')
  expect(fingerprintText('\u0000')).toBe('0-0')
  expect(fingerprintText('\u0000a')).toBe('2p-2p')
  expect(fingerprintText('a')).toBe('2p-2p')
})
