/**
 * @jest-environment node
 */

import {isSSR} from 'src/is-ssr'

describe('isSsr in nodejs', () => {
  it('should be false in a server', () => {
    const result = isSSR()
    expect(result).toBe(true)
  })
})
