/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {isHealthProbe} from '../contract'

describe('isHealthProbe', () => {
  it('should accept the health response contract', () => {
    expect(isHealthProbe({status: 'ok'})).toBe(true)
  })

  it.each([
    null,
    'ok',
    {status: 'unexpected'},
    Object.assign([], {status: 'ok'}),
    Object.assign(new Date(), {status: 'ok'}),
  ])('should reject %j', (value) => {
    expect(isHealthProbe(value)).toBe(false)
  })
})
