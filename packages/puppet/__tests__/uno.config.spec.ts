import {createGenerator} from 'unocss'
import {describe, expect, it} from 'vitest'

import unoConfig from '../uno.config'

describe('unoConfig', () => {
  it('should generate Puppet-owned arbitrary property utilities without a global reset', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate(
      '[border:0.0625rem_solid_#27302d] [grid-template-columns:4.625rem_minmax(0,_1fr)]',
      {preflights: true},
    )

    expect(result.css).toContain('border:0.0625rem solid #27302d')
    expect(result.css).toContain('grid-template-columns:4.625rem minmax(0, 1fr)')
    expect(result.css).not.toContain('box-sizing:border-box')
  })
})
