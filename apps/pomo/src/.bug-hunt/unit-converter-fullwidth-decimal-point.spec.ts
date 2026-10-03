/** @vitest-environment node */
import {expect, it} from 'vitest'

import {convertUnit} from 'src/features/tools/units'

it('should convert decimal values pasted with a fullwidth full stop', () => {
  expect(convertUnit({from: 'm', to: 'm', value: '１０．５'})).toEqual({kind: 'valid', value: 10.5})
  expect(convertUnit({from: 'C', to: 'F', value: '＋３６．５'})).toEqual({
    kind: 'valid',
    value: 97.7,
  })
})
