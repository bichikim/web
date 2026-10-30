import {expect, it} from 'vitest'
import {mouthPairValues, resolveMouthPair} from '../mouth-pair'

const opening = {defaultValue: 0, id: 'ParamMouthOpenY', maximum: 1, minimum: 0}
const form = {defaultValue: 0, id: 'ParamMouthForm', maximum: 1, minimum: -1}
it('should require an unambiguous complete pair rather than a lone opening', () => {
  expect(resolveMouthPair([opening])).toBeUndefined()
  expect(resolveMouthPair([opening, form, {...form}])).toBeUndefined()
  expect(resolveMouthPair([opening, form])).toEqual({form, opening})
})
it('should preserve round and wide forms while modulating opening and resetting silence', () => {
  const pair = {form, opening}
  expect(mouthPairValues(pair, 'a', 0.5, {})).toEqual({ParamMouthForm: 0.2, ParamMouthOpenY: 0.45})
  expect(mouthPairValues(pair, 'i', 0.5, {})).toEqual({ParamMouthForm: 1, ParamMouthOpenY: 0.275})
  expect(mouthPairValues(pair, 'o', 0.5, {})).toEqual({ParamMouthForm: -1, ParamMouthOpenY: 0.325})
  expect(mouthPairValues(pair, 'o', 0, {})).toEqual({ParamMouthForm: 0, ParamMouthOpenY: 0})
  expect(mouthPairValues(pair, null, 1, {})).toEqual({ParamMouthForm: 0, ParamMouthOpenY: 0})
  expect(mouthPairValues(pair, 'o', 1, {inverted: true})).toEqual({
    ParamMouthForm: 1,
    ParamMouthOpenY: 0.65,
  })
})
it('should bound gain and values to the authored model ranges and reject nonfinite input', () => {
  const pair = {form: {...form, minimum: -0.4}, opening: {...opening, maximum: 0.6}}
  expect(mouthPairValues(pair, 'o', 1, {gain: 3})).toEqual({
    ParamMouthForm: -0.4,
    ParamMouthOpenY: 0.6,
  })
  expect(mouthPairValues(pair, 'o', NaN, {})).toEqual({ParamMouthForm: 0, ParamMouthOpenY: 0})
})
