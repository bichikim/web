/** @vitest-environment jsdom */
import {createGenerator} from 'unocss'
import {describe, expect, it} from 'vitest'

import unoConfig from '../uno.config'

describe('unoConfig', () => {
  it('should generate local Iconify masks for every editor icon in the embedded stylesheet', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate('', {safelist: true})
    const icons = Object.keys(unoConfig.shortcuts ?? {}).filter((name) =>
      name.startsWith('puppet-icon-'),
    )
    expect(icons.length).toBeGreaterThan(0)
    for (const name of icons) {
      expect(result.matched.has(name), name).toBe(true)
    }
    expect(result.css).toContain('data:image/svg+xml;utf8,')
    expect(result.css).toContain('mask:')
    expect(result.css).not.toContain('https://api.iconify.design')
  })

  it('should size number icons without CSS borders or rotation', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate('editor-number-step timeline-row-label', {
      safelist: false,
    })
    const style = document.createElement('style')
    style.textContent = result.css
    const surface = document.createElement('div')
    surface.className = 'puppet-editor'
    surface.innerHTML = `<div class="timeline-row-label">
      <button class="editor-number-step decrement"><span class="puppet-icon"></span></button>
    </div>`
    document.head.append(style)
    document.body.append(surface)
    try {
      const icon = getComputedStyle(surface.querySelector('span')!)
      expect(icon.width).toBe('0.75rem')
      expect(icon.height).toBe('0.75rem')
      expect(icon.transform).not.toContain('rotate')
      expect(icon.borderRightStyle).not.toBe('solid')
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
