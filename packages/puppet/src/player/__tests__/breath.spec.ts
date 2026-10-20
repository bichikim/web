import {describe, expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {parseDocumentValue} from '../parse-document'
import {applyBreath} from '../breath'

const document: PuppetDocument = {
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [
    {duration: 1, group: 'tap', id: 'a', tracks: []},
    {duration: 1, group: 'tap', id: 'b', tracks: []},
    {duration: 1, id: 'c', tracks: []},
  ],
  parameterRoles: {lipSync: ['mouth']},
  parameters: [{defaultValue: 0, id: 'mouth', maximum: 1, minimum: 0, name: 'Mouth'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
}

describe('breath', () => {
  test('should add each breath wave with its weight, within the parameter range', () => {
    const breathing: PuppetDocument = {
      ...document,
      breath: [
        {offset: 0, parameterId: 'angle', peak: 10, period: 4, weight: 0.5},
        {offset: 0.5, parameterId: 'mouth', peak: 0.5, period: 2, weight: 1},
      ],
      parameters: [
        ...(document.parameters ?? []),
        {defaultValue: 0, id: 'angle', maximum: 30, minimum: -30, name: 'Angle'},
      ],
    }
    expect(parseDocumentValue(breathing).ok).toBe(true)
    // A quarter of the angle's period: its sine peaks; half the mouth's: only the offset is
    // left. The mouth starts from its default when absent.
    const quarter = applyBreath(breathing, {angle: 2}, 1)
    expect(quarter.angle).toBe(7)
    expect(quarter.mouth).toBeCloseTo(0.5, 12)
    // The mouth's peak would pass its maximum.
    const early = applyBreath(breathing, {angle: 2, mouth: 0.8}, 0.5)
    expect(early.angle).toBeCloseTo(2 + 5 * Math.SQRT1_2, 12)
    expect(early.mouth).toBe(1)
    expect(applyBreath(breathing, {angle: 2, mouth: 0}, 1.5).mouth).toBeCloseTo(0, 12)
    const invalid = (entry: Record<string, unknown>) =>
      parseDocumentValue({...breathing, breath: [{...breathing.breath![0], ...entry}]}).ok
    expect(invalid({period: 0})).toBe(false)
    expect(invalid({parameterId: 'missing'})).toBe(false)
    expect(invalid({weight: Number.NaN})).toBe(false)
    expect(
      parseDocumentValue({...breathing, breath: [breathing.breath![0], breathing.breath![0]]}).ok,
    ).toBe(false)
  })
})
