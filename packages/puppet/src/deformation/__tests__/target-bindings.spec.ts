import {expect, test} from 'vitest'
import type {PuppetParameterBinding1D} from '../../player/document'
import {getTargetBindings} from '../target-bindings'

const binding: PuppetParameterBinding1D = {
  id: 'shape',
  keyforms: [],
  parameterIds: ['x'],
  targetDeformerIds: ['same'],
  targetGroupIds: ['group'],
  targetPartIds: ['same', 'same'],
}

test('should index explicit subjects by kind without losing binding occurrences or order', () => {
  const other = {...binding, id: 'other', targetPartIds: ['other']}
  const bindings = [binding, other, binding]
  expect(getTargetBindings(bindings, 'targetPartIds', 'same')).toEqual([binding, binding])
  expect(getTargetBindings(bindings, 'targetDeformerIds', 'same')).toEqual([
    binding,
    other,
    binding,
  ])
  expect(getTargetBindings(bindings, 'targetGroupIds', 'same')).toEqual([])
  expect(getTargetBindings(bindings, 'targetPartIds', 'same')).toBe(
    getTargetBindings(bindings, 'targetPartIds', 'same'),
  )
})

test('should read replacement target arrays instead of cached bindings', () => {
  const bindings = [binding]
  expect(getTargetBindings(bindings, 'targetPartIds', 'same')).toEqual([binding])
  expect(getTargetBindings([{...binding, targetPartIds: []}], 'targetPartIds', 'same')).toEqual([])
  expect(getTargetBindings(bindings, 'targetPartIds', 'same')).toEqual([binding])
})
