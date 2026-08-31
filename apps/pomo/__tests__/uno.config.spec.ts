import {createGenerator} from 'unocss'
import {expect, it} from 'vitest'

import unoConfig from '../uno.config'

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

  expect(css).toContain('.pomo-loading{')
  expect(css).toContain('font-weight:650;')
  expect(css).toContain('.pomo-loading__spinner{')
  expect(css).toContain('.pomo-scene-fallback{')
  expect(css).toContain('.pomo-scene-fallback__panel{')
})
