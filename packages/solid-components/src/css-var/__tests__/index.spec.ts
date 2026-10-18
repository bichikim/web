import {expect, it} from 'vitest'
import {BAR_PERCENT, PERCENT_VAR, POSITION_VAR, SIZE_VAR} from '..'

it('should preserve the published CSS custom property names', () => {
  expect([BAR_PERCENT, PERCENT_VAR, POSITION_VAR, SIZE_VAR]).toEqual([
    '--var-bar-percent',
    '--var-percent',
    '--var-position',
    '--var-size',
  ])
})
