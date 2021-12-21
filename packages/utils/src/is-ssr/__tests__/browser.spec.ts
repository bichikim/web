/**
 * @jest-environment jsdom
 */

import {isSSR} from '../'

describe('isSSR in browser', () => {
  it('should be false in a browser', () => {
    const result = isSSR()
    expect(result).toBe(false)
  })
})
