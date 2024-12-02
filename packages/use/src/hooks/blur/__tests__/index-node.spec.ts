/**
 * @vitest-environment node
 */

import {useBlur} from '../'
import {describe, expect, it} from 'vitest'

describe('blur', () => {
  it('should work well in ssr environment', async () => {
    expect(() => useBlur()).not.toThrowError()
  })
})
