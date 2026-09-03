import {expect, it} from 'vitest'

import {
  getCanonicalPathname,
  isPomoHomePath,
  isSearchIndexablePath,
  normalizePathname,
  usesPomoLayout,
} from '../pomo-route'

it.each([
  ['/', '/'],
  ['///', '/'],
  ['/dev/terms', '/dev/terms'],
  ['/dev/terms/', '/dev/terms'],
  ['/en', '/en'],
  ['/ko/', '/ko'],
  ['/en/dialogue/', '/en/dialogue'],
])('should normalize %s to %s', (pathname, expected) => {
  expect(normalizePathname(pathname)).toBe(expected)
})

it.each([
  ['/', true],
  ['/dialogue', true],
  ['/dialogue/', true],
  ['/en', false],
  ['/ko/', false],
  ['/en/dialogue', false],
  ['/dev', false],
  ['/dev/dialogue', false],
])('should classify %s as a Pomo layout route when expected', (pathname, expected) => {
  expect(usesPomoLayout(pathname)).toBe(expected)
})

it.each([
  ['/', true],
  ['///', true],
  ['/dialogue', false],
  ['/dialogue/', false],
  ['/en', false],
  ['/ko/', false],
  ['/en/dialogue', false],
])(
  'should enable entry playback for %s only when it is the Pomo home route',
  (pathname, expected) => {
    expect(isPomoHomePath(pathname)).toBe(expected)
  },
)

it.each([
  ['/', true],
  ['/ko/', false],
  ['/en/', false],
  ['/refund-policy', true],
  ['/refund-policy/', true],
  ['/third-party-notices', true],
  ['/third-party-notices/', true],
  ['/whats-new', true],
  ['/whats-new/', true],
  ['/account', false],
  ['/admin/login', false],
  ['/dev/terms', false],
  ['/dialogue', false],
])('should expose %s to search indexing when expected', (pathname, expected) => {
  expect(isSearchIndexablePath(pathname)).toBe(expected)
})

it.each([
  ['/', '/'],
  ['/refund-policy/', '/refund-policy'],
  ['/ko/', '/ko'],
  ['/en/account', '/en/account'],
])('should resolve the canonical pathname for %s', (pathname, expected) => {
  expect(getCanonicalPathname(pathname)).toBe(expected)
})
