import {expect, it} from 'vitest'

import {
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
])('should normalize %s to %s', (pathname, expected) => {
  expect(normalizePathname(pathname)).toBe(expected)
})

it.each([
  ['/', true],
  ['/dialogue', true],
  ['/dialogue/', true],
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
])(
  'should enable entry playback for %s only when it is the Pomo home route',
  (pathname, expected) => {
    expect(isPomoHomePath(pathname)).toBe(expected)
  },
)

it.each([
  ['/', true],
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
