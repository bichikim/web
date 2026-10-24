import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocumentValue, type PuppetDocument} from '../../../player'
import {mapDocumentReferences} from '../document-references'
import {mergeDocument} from '../merge-document'
import {deleteParameter} from '../parameter-keyforms'
import {removeParts} from '../remove-parts'

const createPresetDocument = (): PuppetDocument => ({
  ...createDemoDocument(),
  expressions: [
    {id: 'smile', parameters: [{blend: 'overwrite', parameterId: 'angle-x', value: 10}]},
  ],
  hitAreas: [
    {id: 'body', partIds: ['mesh-preview']},
    {id: 'accent', partIds: ['shape-circle', 'shape-diamond']},
  ],
  poseGroups: [
    {
      entries: [
        {partIds: ['shape-circle'], value: -30},
        {partIds: ['shape-diamond'], value: 30},
      ],
      id: 'shape-pose',
      parameterId: 'angle-x',
    },
  ],
})

describe('expression, pose and hit area references', () => {
  test('should rename every preset reference', () => {
    const renamed = mapDocumentReferences({
      document: createPresetDocument(),
      rename: (id) => `copy:${id}`,
    })

    expect(renamed.expressions?.[0]).toEqual({
      id: 'copy:smile',
      parameters: [{blend: 'overwrite', parameterId: 'copy:angle-x', value: 10}],
    })
    expect(renamed.hitAreas?.map((area) => [area.id, area.partIds])).toEqual([
      ['copy:body', ['copy:mesh-preview']],
      ['copy:accent', ['copy:shape-circle', 'copy:shape-diamond']],
    ])
    expect(renamed.poseGroups?.[0]?.parameterId).toBe('copy:angle-x')
    expect(parseDocumentValue(renamed).ok).toBe(true)
  })

  test('should drop removed parts from hit areas and pose entries', () => {
    const result = removeParts(createPresetDocument(), new Set(['shape-circle', 'mesh-preview']))

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const removed = result.document
    expect(removed.hitAreas).toEqual([{id: 'accent', partIds: ['shape-diamond']}])
    expect(removed.poseGroups?.[0]?.entries).toEqual([{partIds: ['shape-diamond'], value: 30}])
  })

  test('should drop expression entries and pose groups of deleted parameters', () => {
    const document = createPresetDocument()
    const deleted = deleteParameter({bindingId: document.parameterBindings![0]!.id, document})

    expect(deleted?.expressions).toEqual([{id: 'smile', parameters: []}])
    expect(deleted?.poseGroups).toEqual([])
  })

  test('should keep and rename presets when merging documents', () => {
    const document = createPresetDocument()
    const merged = mergeDocument(document, document)

    expect(merged.ok).toBe(true)
    if (!merged.ok) {
      return
    }
    expect(merged.document.expressions?.map((expression) => expression.id)).toEqual([
      'smile',
      'import-1:smile',
    ])
    expect(merged.document.hitAreas).toHaveLength(4)
    expect(merged.document.poseGroups?.map((group) => group.parameterId)).toEqual([
      'angle-x',
      'import-1:angle-x',
    ])
  })
})
