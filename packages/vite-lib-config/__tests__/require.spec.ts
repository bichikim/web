import {describe, expect, it} from 'vitest'

import config from '@winter-love/vite-lib-config/require'

describe('require config', () => {
  it('should create the default Vite library config', () => {
    expect(config).toEqual(expect.any(Function))
  })
})
