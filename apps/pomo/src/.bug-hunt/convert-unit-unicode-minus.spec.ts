/** @vitest-environment node */
import {expect, it} from 'vitest'

import {convertUnit} from '../features/tools/units'

it('should convert temperatures pasted with a Unicode minus sign', () => {
  expect(convertUnit({from: 'C', to: 'F', value: '−40'})).toEqual({
    kind: 'valid',
    value: -40,
  })
})
