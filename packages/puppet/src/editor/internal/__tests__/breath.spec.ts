import {describe, expect, test} from 'vitest'

import {
  parseDocumentValue,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {addBreathParameter, removeBreathParameter, updateBreathParameter} from '../breath'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [
    {defaultValue: 0, id: 'breath', maximum: 1, minimum: 0, name: 'Breath'},
    {defaultValue: 0, id: 'angle', maximum: 30, minimum: -30, name: 'Angle'},
  ],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

describe('breath editing', () => {
  test('should add each parameter once around the middle of its range', () => {
    const first = addBreathParameter(createDocument())!
    const second = addBreathParameter(first)!
    expect(second.breath).toEqual([
      {offset: 0.5, parameterId: 'breath', peak: 0.25, period: 3.5, weight: 0.5},
      {offset: 0, parameterId: 'angle', peak: 15, period: 3.5, weight: 0.5},
    ])
    expect(parseDocumentValue(second).ok).toBe(true)
    expect(addBreathParameter(second)).toBeUndefined()
    // A parameter breathing elsewhere and a non-positive period are refused.
    expect(updateBreathParameter(second, 1, {parameterId: 'breath'})).toBeUndefined()
    expect(updateBreathParameter(second, 1, {period: 0})).toBeUndefined()
    expect(updateBreathParameter(second, 1, {peak: 10})?.breath?.[1]?.peak).toBe(10)
    expect(removeBreathParameter(removeBreathParameter(second, 0), 0)).not.toHaveProperty('breath')
  })
})
