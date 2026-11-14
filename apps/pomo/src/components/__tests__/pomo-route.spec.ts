/** @vitest-environment node */
import {expect, it} from 'vitest'

import {isSearchIndexablePath} from '../pomo-route'

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
