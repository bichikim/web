import {describe, expect, it} from 'vitest'

import config from '../require.mjs'

describe('require config', () => {
  it('should create the default Vite library config', () => {
    expect(config).toEqual(expect.any(Function))
  })
})
