import {createGenerator} from 'unocss'
import {expect, it} from 'vitest'

import unoConfig from '../uno.config'

it('should generate initial scene fallback utilities without extracted source', async () => {
  const uno = await createGenerator(unoConfig)
  const {css, matched} = await uno.generate('', {safelist: true})

  for (const utility of [
    'absolute',
    'animate-spin',
    'font-650',
    'h-4',
    'inset-0',
    'place-items-center',
    'px-3',
    'w-4',
  ]) {
    expect(matched).toContain(utility)
  }

  expect(css).toContain('.font-650{font-weight:650;}')
})
