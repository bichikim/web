import {expect, test} from 'vitest'
import {captureRuntimeInputs} from '../capture-runtime-inputs'
import {createState} from './fixtures/runtime-state'
test('should own controls independently from mutable maps and omit integrated simulation state', () => {
  const blends = new Map()
  const state = createState()
  const captured = captureRuntimeInputs({
    ...state,
    adjustments: {
      ...state.adjustments,
      blends: {'after-physics': new Map(), 'before-physics': blends},
    },
  })
  blends.set('p', {mode: 'overwrite', value: 1, weight: 1})
  expect(captured.adjustments.blends['before-physics'].size).toBe(0)
  expect(captured).not.toHaveProperty('physicsState')
  expect(captured).not.toHaveProperty('chainState')
  expect(captured).not.toHaveProperty('frameValues')
})
