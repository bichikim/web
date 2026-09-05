/** @vitest-environment jsdom */
import {createGenerator} from 'unocss'
import {describe, expect, it} from 'vitest'

import unoConfig from '../uno.config'

describe('unoConfig', () => {
  it('should keep timeline number-step text hidden behind the CSS arrow', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate('editor-number-step timeline-row-label', {
      safelist: false,
    })
    const style = document.createElement('style')
    style.textContent = result.css
    const surface = document.createElement('div')
    surface.className = 'puppet-editor'
    surface.innerHTML = `<div class="timeline-row-label">
      <button class="editor-number-step decrement"><span>‹</span></button>
    </div>`
    document.head.append(style)
    document.body.append(surface)
    try {
      expect(getComputedStyle(surface.querySelector('span')!).fontSize).toBe('0px')
    } finally {
      surface.remove()
      style.remove()
    }
  })

  it('should generate Puppet-owned arbitrary property utilities without a global reset', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate(
      '[border:0.0625rem_solid_#27302d] [grid-template-columns:4.625rem_minmax(0,_1fr)]',
      {preflights: true, safelist: false},
    )

    expect(result.css).toContain('border:0.0625rem solid #27302d')
    expect(result.css).toContain('grid-template-columns:4.625rem minmax(0, 1fr)')
    expect(result.css).not.toContain('box-sizing:border-box')
  })
})
