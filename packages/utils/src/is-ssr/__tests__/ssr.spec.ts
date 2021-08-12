/**
 * @jest-environment node
 */

import {isSSR} from 'src/is-ssr'

describe('isSsr in nodejs', () => {
  it('should be false', () => {
    const result = isSSR()
    expect(result).toBe(true)
  })
})
