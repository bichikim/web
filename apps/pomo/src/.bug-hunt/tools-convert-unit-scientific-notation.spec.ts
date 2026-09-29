/** @vitest-environment node */
import {expect, it} from 'vitest'

import {convertUnit} from '../features/tools/units'

it('should reject scientific notation in unit conversion input', () => {
  expect(convertUnit({from: 'm', to: 'ft', value: '1e2'})).toEqual({kind: 'invalid'})
})
