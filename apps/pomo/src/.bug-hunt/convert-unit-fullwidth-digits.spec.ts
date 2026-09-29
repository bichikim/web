/** @vitest-environment node */
import {expect, it} from 'vitest'

import {convertUnit} from '../features/tools/units'

it('should convert values pasted with fullwidth digits', () => {
  expect(convertUnit({from: 'm', to: 'ft', value: '１０'})).toEqual({
    kind: 'valid',
    value: 32.8084,
  })
})
