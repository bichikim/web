import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  parseDocumentValue,
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../../../player'
import {mapDocumentReferences} from '../document-references'
import {removeParameterReferences} from '../document-references/remove-parameter-references'
import {addLookParameter, updateLookParameter} from '../look'
import {mergeDocument} from '../merge-document'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30, name: 'Face X'},
    {defaultValue: 0, id: 'gaze-x', maximum: 1, minimum: -1, name: 'Gaze X'},
  ],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

describe('look editing', () => {
  test('should add each parameter once following the horizontal look with half its range', () => {
    const both = addLookParameter(addLookParameter(createDocument())!)!
    expect(both.look).toEqual([
      {parameterId: 'face-x', x: 30, xy: 0, y: 0},
      {parameterId: 'gaze-x', x: 1, xy: 0, y: 0},
    ])
    expect(parseDocumentValue(both).ok).toBe(true)
    expect(addLookParameter(both)).toBeUndefined()
    expect(updateLookParameter(both, 1, {parameterId: 'face-x'})).toBeUndefined()
  })

  test('should rename, drop and merge look parameters with their parameters', () => {
    const document: PuppetDocument = {
      ...createDemoDocument(),
      look: [{parameterId: 'angle-x', x: 30, xy: 0, y: 0}],
    }
    const renamed = mapDocumentReferences({document, rename: (id) => `new:${id}`})
    expect(renamed.look?.[0]?.parameterId).toBe('new:angle-x')
    expect(removeParameterReferences(document, new Set(['angle-x'])).look).toBeUndefined()
    const merged = mergeDocument(document, document)
    expect(merged.ok && merged.document.look?.map((entry) => entry.parameterId)).toEqual([
      'angle-x',
      'import-1:angle-x',
    ])
  })
})
