import {describe, expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {
  applyParameterBlends,
  blendParameterValue,
  normalizeParameterBlend,
  type PuppetParameterBlend,
} from '../parameter-blends'

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [
    {defaultValue: 0, id: 'angle', maximum: 30, minimum: -30, name: 'Angle'},
    {defaultValue: 0, id: 'turn', maximum: 360, minimum: 0, name: 'Turn', repeat: true},
    {defaultValue: 1, id: 'open', maximum: 1, minimum: 0, name: 'Open'},
  ],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
}

describe('parameter blends', () => {
  test('should overwrite, add and multiply by the weight', () => {
    expect(blendParameterValue(10, {mode: 'overwrite', value: 20})).toBe(20)
    // Half the weight leaves half of the previous value.
    expect(blendParameterValue(10, {mode: 'overwrite', value: 20, weight: 0.5})).toBe(15)
    expect(blendParameterValue(10, {mode: 'add', value: 4, weight: 0.5})).toBe(12)
    expect(blendParameterValue(10, {mode: 'multiply', value: 3})).toBe(30)
    expect(blendParameterValue(10, {mode: 'multiply', value: 3, weight: 0.5})).toBe(20)
    expect(blendParameterValue(10, {mode: 'multiply', value: 0, weight: 0})).toBe(10)
  })

  test('should limit the weight and refuse other values', () => {
    expect(normalizeParameterBlend({mode: 'add', value: 1, weight: 2})).toEqual({
      mode: 'add',
      value: 1,
      weight: 1,
    })
    expect(normalizeParameterBlend({mode: 'add', value: 1})).toEqual({
      mode: 'add',
      value: 1,
      weight: 1,
    })
    expect(normalizeParameterBlend({mode: 'add', value: Number.NaN})).toBeUndefined()
    expect(normalizeParameterBlend({mode: 'add', value: 1, weight: Number.NaN})).toBeUndefined()
    const unknown = {mode: 'screen', value: 1} as unknown as PuppetParameterBlend
    expect(normalizeParameterBlend(unknown)).toBeUndefined()
  })

  test('should start from the default and keep results within range or wrapped', () => {
    const blends = new Map<string, PuppetParameterBlend>([
      ['angle', {mode: 'add', value: 50}],
      ['open', {mode: 'multiply', value: 0.5}],
      ['turn', {mode: 'add', value: 30}],
    ])
    expect(applyParameterBlends(document, {angle: 5, turn: 350}, blends)).toEqual({
      angle: 30,
      open: 0.5,
      turn: 20,
    })
    const values = {angle: 5}
    expect(applyParameterBlends(document, values, new Map())).toBe(values)
  })
})
