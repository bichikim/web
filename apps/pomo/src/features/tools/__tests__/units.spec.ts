/** @vitest-environment node */
import {expect, it} from 'vitest'
import {convertUnit, getUnits} from '../units'
it('should convert exact length mass area and volume definitions', () => {
  expect(convertUnit({from: 'ft', to: 'm', value: '1'})).toEqual({kind: 'valid', value: 0.3048})
  expect(convertUnit({from: 'lb', to: 'kg', value: '1'})).toEqual({
    kind: 'valid',
    value: 0.45359237,
  })
  expect(convertUnit({from: 'm2', to: 'pyeong', value: '400'})).toEqual({kind: 'valid', value: 121})
  expect(convertUnit({from: 'L', to: 'mL', value: '1'})).toEqual({kind: 'valid', value: 1000})
})
it('should convert temperature offsets and accept negative temperatures', () => {
  expect(convertUnit({from: 'C', to: 'F', value: '-40'})).toEqual({kind: 'valid', value: -40})
  expect(convertUnit({from: 'F', to: 'C', value: '32'})).toEqual({kind: 'valid', value: 0})
})
it('should reject malformed mismatched and overflowing values while keeping blank input empty', () => {
  expect(convertUnit({from: 'm', to: 'ft', value: ''}).kind).toBe('empty')
  for (const value of ['abc', '0xff', '1,23', 'Infinity', '1e309']) {
    expect(convertUnit({from: 'm', to: 'ft', value}).kind).toBe('invalid')
  }
  expect(convertUnit({from: 'm', to: 'kg', value: '1'}).kind).toBe('invalid')
  expect(convertUnit({from: 'm', to: 'm', value: '1,000.5'})).toEqual({
    kind: 'valid',
    value: 1000.5,
  })
})
it('should include pyeong only for Korean', () => {
  expect(getUnits('area', 'en').some((unit) => unit.id === 'pyeong')).toBe(false)
  expect(getUnits('area', 'ko').some((unit) => unit.id === 'pyeong')).toBe(true)
})
