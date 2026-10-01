/** @vitest-environment node */
import {expect, it} from 'vitest'

import {convertUnit} from '../features/tools/units'

it('should convert thousands pasted with a fullwidth comma separator', () => {
  expect(convertUnit({from: 'm', to: 'm', value: '1，000'})).toEqual({kind: 'valid', value: 1000})
})

it('should accept the same value when the thousands separator is an ASCII comma', () => {
  expect(convertUnit({from: 'm', to: 'm', value: '1,000'})).toEqual({kind: 'valid', value: 1000})
})
