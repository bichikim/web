/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getCanonicalPathname, isSearchIndexablePath, normalizePathname} from '../pomo-route'

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
