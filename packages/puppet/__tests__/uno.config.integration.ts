/** @vitest-environment jsdom */
import {createGenerator} from 'unocss'
import {describe, expect, it} from 'vitest'

import unoConfig from '../uno.config'

describe('unoConfig', () => {
  it('should include compact layer-order summaries in the embedded stylesheet', async () => {
    const generator = await createGenerator(unoConfig)
    const result = await generator.generate('', {safelist: true})
    expect(result.matched.has('order-rule-heading')).toBe(true)
    expect(result.css).toContain('.order-rule-summary-content')
    expect(result.css).toMatch(/\.order-rule-heading[^{}]*\{[^}]*font-size:0\.625rem/)
  })

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
})
