import {expect, it} from 'vitest'

import {isPomoHomePath, usesPomoLayout} from '../pomo-route'

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
