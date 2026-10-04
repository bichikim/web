/** @vitest-environment node */
import {expect, it} from 'vitest'

import {convertUnit} from '../features/tools/units'

const NARROW_NO_BREAK_SPACE = '\u202f'

it('should convert values pasted with a narrow no-break space thousands separator', () => {
  expect(convertUnit({from: 'm', to: 'm', value: `1${NARROW_NO_BREAK_SPACE}000.5`})).toEqual({
    kind: 'valid',
    value: 1000.5,
  })
})
