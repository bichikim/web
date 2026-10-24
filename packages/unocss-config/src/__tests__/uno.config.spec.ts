import {createGenerator} from 'unocss'
import {describe, expect, it} from 'vitest'

import unoConfig from '../index'

describe('UnoCSS config', () => {
  it('should generate project rules, shortcuts, and Kobalte state variants', async () => {
    const uno = await createGenerator(unoConfig)
    const {css} = await uno.generate(
      'outline-opacity-25 disable-tap-zoom scrollbar-none aurora ui-checked:bg-red',
    )

    expect(css).toContain('--un-outline-color-opacity:0.25')
    expect(css).toContain('touch-action:manipulation')
    expect(css).toContain('::-webkit-scrollbar')
    expect(css).toContain('animation:aurora')
    expect(css).toContain('[data-checked]')
  })

  it('should fall back to full outline opacity for a nonnumeric value', async () => {
    const uno = await createGenerator(unoConfig)
    const {css} = await uno.generate('outline-opacity-invalid')

    expect(css).toContain('--un-outline-color-opacity:1')
  })
})
