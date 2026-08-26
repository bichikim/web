import {expect, it} from 'vitest'

import {MILLISECONDS_PER_SECOND} from '../shared'

it('should expose the exact milliseconds conversion', () => {
  expect(MILLISECONDS_PER_SECOND).toBe(1000)
})
