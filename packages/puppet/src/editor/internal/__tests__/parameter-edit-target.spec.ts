import {describe, expect, test} from 'vitest'

import {getParameterEditTarget} from '../parameter-edit-target'

describe('getParameterEditTarget', () => {
  test('should select a keyform only for an active targeted parameter binding', () => {
    expect(
      getParameterEditTarget({
        activeBindingId: 'binding',
        activeKeyformValues: [0.5],
        editMode: 'parameter',
        nodeId: 'part',
        targetNodeIds: ['part'],
      }),
    ).toEqual({bindingId: 'binding', kind: 'keyform', values: [0.5]})
  })

  test('should select rest values outside an active targeted parameter keyform', () => {
    expect(
      getParameterEditTarget({
        activeBindingId: 'binding',
        activeKeyformValues: [0.5],
        editMode: 'parameter',
        nodeId: 'other-part',
        targetNodeIds: ['part'],
      }),
    ).toEqual({kind: 'rest'})
  })
})
