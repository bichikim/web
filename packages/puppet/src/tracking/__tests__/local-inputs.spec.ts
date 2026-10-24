import {expect, test} from 'vitest'
import {addLocalInput, getLocalInputIds, isMappingInput, removeLocalInput} from '../local-inputs'
import type {RuntimeProfile} from '../types'
const profile: RuntimeProfile = {
  expressions: [],
  mappings: [
    {
      enabled: true,
      input: 'manualValue:second',
      inputMaximum: 1,
      inputMinimum: 0,
      outputMaximum: 1,
      outputMinimum: 0,
      parameterId: 'mouth',
      smoothing: 0,
    },
  ],
  motions: [],
  signature: 'model',
  version: 2,
}
test('should add independent local inputs and retain legacy inputs', () => {
  const result = addLocalInput(profile, 'manualValue:second')
  expect(getLocalInputIds(result)).toEqual(['manualValue', 'buttonValue', 'manualValue:second'])
  expect(result.inputs?.['manualValue:second']).toBe(0)
  expect(isMappingInput('manualValue:second')).toBe(true)
  expect(isMappingInput('unknown')).toBe(false)
})
test('should remove only the selected input and disconnect its mappings', () => {
  const result = removeLocalInput(
    addLocalInput(profile, 'manualValue:second'),
    'manualValue:second',
  )
  expect(getLocalInputIds(result)).toEqual(['manualValue', 'buttonValue'])
  expect(result.inputs?.['manualValue:second']).toBeUndefined()
  expect(result.mappings[0]).toMatchObject({inputConnected: false, parameterId: 'mouth'})
})
