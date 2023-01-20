/**
 * @jest-environment node
 */

import {useBlur} from '../'

describe('blur', () => {
  it('should work well in ssr environment', async () => {
    expect(() => useBlur()).not.toThrowError()
  })
})
