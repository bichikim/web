import {expect, it} from 'vitest'

import {
  getCanonicalPathname,
  getPomoHomeHref,
  isPomoHomePath,
  isSearchIndexablePath,
  normalizePathname,
  usesPomoLayout,
} from '../pomo-route'

it.each([
  ['ko', '/ko/'],
  ['en', '/en/'],
] as const)('should resolve the %s Pomofi home route to %s', (locale, expected) => {
  expect(getPomoHomeHref(locale)).toBe(expected)
})

it.each([
  ['/', '/'],
  ['///', '/'],
  ['/dev/terms', '/dev/terms'],
  ['/dev/terms/', '/dev/terms'],
  ['/en', '/'],
  ['/ko/', '/'],
  ['/en/dialogue/', '/dialogue'],
])('should normalize %s to %s', (pathname, expected) => {
  expect(normalizePathname(pathname)).toBe(expected)
})

it.each([
  ['/', false],
  ['/dialogue', true],
  ['/dialogue/', true],
  ['/en', true],
  ['/ko/', true],
  ['/en/dialogue', true],
  ['/dev', false],
  ['/dev/dialogue', false],
])('should classify %s as a Pomo layout route when expected', (pathname, expected) => {
  expect(usesPomoLayout(pathname)).toBe(expected)
})

it.each([
  ['/', false],
  ['///', false],
  ['/dialogue', false],
  ['/dialogue/', false],
  ['/en', true],
  ['/ko/', true],
  ['/en/dialogue', false],
])(
  'should enable entry playback for %s only when it is the Pomo home route',
  (pathname, expected) => {
    expect(isPomoHomePath(pathname)).toBe(expected)
  },
)

it.each([
  ['/', false],
  ['/ko/', true],
  ['/en/', true],
  ['/refund-policy', true],
  ['/refund-policy/', true],
  ['/third-party-notices', true],
  ['/third-party-notices/', true],
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
  ['/ko/', '/ko/'],
  ['/en/account', '/en/account/'],
])('should resolve the canonical pathname for %s', (pathname, expected) => {
  expect(getCanonicalPathname(pathname)).toBe(expected)
})
