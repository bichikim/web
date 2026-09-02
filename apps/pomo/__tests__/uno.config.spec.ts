import {createGenerator} from 'unocss'
import {expect, it} from 'vitest'

import unoConfig from '../uno.config'

const getRuleBody = (css: string, selector: string) => {
  const match = new RegExp(`\\.${selector}\\{([^}]*)\\}`).exec(css)

  expect(match).not.toBeNull()

  return match?.[1] ?? ''
}

it('should generate initial scene fallback shortcuts without extracted source', async () => {
  const uno = await createGenerator(unoConfig)
  const {css, matched} = await uno.generate('', {safelist: true})

  for (const shortcut of [
    'pomo-loading',
    'pomo-loading__spinner',
    'pomo-scene-fallback',
    'pomo-scene-fallback__panel',
  ]) {
    expect(matched).toContain(shortcut)
  }

  const loadingRule = getRuleBody(css, 'pomo-loading')
  const spinnerRule = getRuleBody(css, 'pomo-loading__spinner')
  const sceneFallbackRule = getRuleBody(css, 'pomo-scene-fallback')
  const panelRule = getRuleBody(css, 'pomo-scene-fallback__panel')

  expect(loadingRule).toContain('padding-top:0;')
  expect(loadingRule).toContain('padding-bottom:0;')
  expect(loadingRule).toContain('padding-left:0.75rem;')
  expect(loadingRule).toContain('padding-right:0.75rem;')
  expect(loadingRule).toContain('font-size:0.875rem;')
  expect(loadingRule).toContain('line-height:1.25rem;')
  expect(loadingRule).toContain('font-weight:650;')
  expect(spinnerRule).toContain('width:1.125rem;')
  expect(spinnerRule).toContain('height:1.125rem;')
  expect(spinnerRule).toContain('animation:spin 1s linear infinite;')
  expect(sceneFallbackRule).toContain('position:absolute;')
  expect(sceneFallbackRule).toContain('inset:0;')
  expect(sceneFallbackRule).toContain('display:grid;')
  expect(sceneFallbackRule).toContain('place-items:center;')
  expect(panelRule).toContain('border-style:solid;')
  expect(panelRule).toContain('backdrop-filter:')
})

it('should generate the narrow player container variant', async () => {
  const uno = await createGenerator(unoConfig)
  const {css} = await uno.generate('player-narrow:hidden')

  expect(css).toContain('@container pomo-player (width < 18rem)')
  expect(css).toContain('display:none;')
})
