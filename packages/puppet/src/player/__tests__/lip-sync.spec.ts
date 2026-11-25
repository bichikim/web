import {describe, expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../document'
import {applyLipSync} from '../lip-sync'

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

describe('lip sync', () => {
  test('should add the lip-sync level within the parameter range', () => {
    expect(applyLipSync(document, {mouth: 0.6}, 0.3).mouth).toBeCloseTo(0.9)
    expect(applyLipSync(document, {mouth: 0.9}, 0.3).mouth).toBe(1)
  })
})

test('should add lip sync to the default value when a role is missing from a sparse map', () => {
  const model = {
    ...document,
    parameters: document.parameters!.map((parameter) => ({...parameter, defaultValue: 0.25})),
  }

  expect(applyLipSync(model, {other: 0.1}, 0.5)).toEqual({mouth: 0.75, other: 0.1})
})
