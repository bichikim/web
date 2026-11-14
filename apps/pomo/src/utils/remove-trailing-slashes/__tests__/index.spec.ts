/** @vitest-environment node */
import {expect, it} from 'vitest'

import {removeTrailingSlashes} from '..'

it.each([
  ['', '/'],
  ['/', '/'],
  ['///', '/'],
  ['/dev/terms', '/dev/terms'],
  ['/dev/terms/', '/dev/terms'],
  ['/en', '/en'],
  ['/ko/', '/ko'],
  ['/en/dialogue/', '/en/dialogue'],
  ['/refund-policy/', '/refund-policy'],
  ['/en/account', '/en/account'],
  ['/a//b///', '/a//b'],
  ['/a/ ', '/a/ '],
])(
  'should remove trailing slashes from %j while preserving the root as %j',
  (pathname, expected) => {
    expect(removeTrailingSlashes(pathname)).toBe(expected)
  },
)
