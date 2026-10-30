import {expect, it} from 'vitest'
import {lipSyncValue, resolveLipSyncParameter} from '../parameters'

const mouth = {defaultValue: 0, id: 'mouth-a', maximum: 1, minimum: 0}
it('should resolve an unambiguous vowel pose and preserve explicit custom connections', () => {
  const custom = {...mouth, id: 'custom', name: '입 열림'}
  expect(resolveLipSyncParameter([mouth])).toBe(mouth)
  expect(resolveLipSyncParameter([mouth, custom], 'custom')).toBe(custom)
  expect(resolveLipSyncParameter([mouth], null)).toBeUndefined()
  expect(resolveLipSyncParameter([mouth], 'missing')).toBeUndefined()
  expect(resolveLipSyncParameter([mouth, {...mouth, id: 'ParamMouthA'}])).toBeUndefined()
})
it('should map amplitude from the resting value, apply gain and inversion and respect model bounds', () => {
  const parameter = {...mouth, defaultValue: 2, maximum: 6, minimum: -2}
  expect(lipSyncValue(parameter, 0, {})).toBe(2)
  expect(lipSyncValue(parameter, 0.5, {})).toBe(4)
  expect(lipSyncValue(parameter, 0.5, {gain: 2})).toBe(6)
  expect(lipSyncValue(parameter, 1, {inverted: true})).toBe(-2)
  expect(lipSyncValue(parameter, Infinity, {})).toBe(2)
  expect(lipSyncValue(mouth, 0, {inverted: true})).toBe(1)
  expect(lipSyncValue(mouth, 1, {inverted: true})).toBe(0)
})

it('should resolve vowel parameters independently and never infer mouth opening', () => {
  const parameters = ['a', 'i', 'u', 'e', 'o'].map((shape) => ({...mouth, id: `mouth-${shape}`}))
  expect(resolveLipSyncParameter([{...mouth, id: 'mouth-open'}])).toBeUndefined()
  expect(resolveLipSyncParameter(parameters, undefined, 'e')?.id).toBe('mouth-e')
})
