import {expect, test} from 'vitest'
import example from '../../../../../examples/rotation-skinning.json'
import {parseDocumentValue} from '../../../../player/parse-document'
import {mapDocumentReferences} from '../map-document-references'
import {createDemoDocument} from '../../../../player/create-demo-document'

test('should rename layer rule references and remove rules with removed anchors or empty selections', () => {
  const source = createDemoDocument()
  const partIds = source.parts.map((part) => part.id)
  const document = {
    ...source,
    layerOrderRules: [
      {
        partIds: partIds.slice(1),
        placement: 'before' as const,
        referencePartId: partIds[0]!,
        when: {
          comparison: 'greater-than' as const,
          parameterIds: [source.parameters![0]!.id],
          threshold: 20,
        },
      },
    ],
  }
  const renamed = mapDocumentReferences({document, rename: (id) => `copy:${id}`})
  expect(parseDocumentValue(renamed).ok).toBe(true)
  expect(renamed.layerOrderRules![0]).toMatchObject({
    partIds: partIds.slice(1).map((id) => `copy:${id}`),
    referencePartId: `copy:${partIds[0]}`,
    when: {parameterIds: [`copy:${source.parameters![0]!.id}`]},
  })
  const trimmed = mapDocumentReferences({
    document,
    keepPart: (id) => id !== partIds[1],
    rename: (id) => id,
  })
  expect(trimmed.layerOrderRules![0]!.partIds).toEqual([partIds[2]])
  expect(parseDocumentValue(trimmed).ok).toBe(true)
  expect(
    mapDocumentReferences({document, keepPart: (id) => id !== partIds[0], rename: (id) => id})
      .layerOrderRules,
  ).toEqual([])
  expect(
    mapDocumentReferences({document, keepPart: (id) => id === partIds[0], rename: (id) => id})
      .layerOrderRules,
  ).toEqual([])
})

test('should transform references inside deformer bind shapes and preserve unrelated values', () => {
  const parsed = parseDocumentValue(example)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    return
  }
  const root = parsed.document.scene!.roots[0]!
  if (root.kind !== 'deformer') {
    throw new Error('Expected deformer fixture')
  }
  const shape = {
    boneRestPoints: root.boneRestPoints,
    boneWeights: [{partId: 'upper', vertexIndex: 0, weights: [1]}],
    bounds: root.bounds,
    columns: root.columns,
    controlPoints: root.controlPoints,
    deformerType: undefined,
    rows: root.rows,
    vertexInfluences: [{partId: 'upper', vertexIndex: 0, weight: 0.5}],
  }
  const document = {
    ...parsed.document,
    motions: [],
    parameterBindings: [],
    parameters: [],
    parts: [parsed.document.parts[0]!],
    scene: {
      roots: [
        {
          ...root,
          ...shape,
          binding: {rest: shape, steps: [{rest: shape, shape}]},
          children: [root.children[0]!],
        },
      ],
    },
  }
  expect(parseDocumentValue(document).ok).toBe(true)
  const renamed = mapDocumentReferences({document, rename: (id) => `copy:${id}`})
  expect(parseDocumentValue(renamed).ok).toBe(true)
  const mapped = renamed.scene!.roots[0]!
  if (mapped.kind !== 'deformer') {
    throw new Error('Expected mapped deformer')
  }
  expect(mapped.boneWeights![0]!.partId).toBe('copy:upper')
  expect(mapped.vertexInfluences![0]!.partId).toBe('copy:upper')
  expect(mapped.binding!.rest.boneWeights![0]!.partId).toBe('copy:upper')
  expect(mapped.binding!.steps[0]!.rest!.vertexInfluences![0]!.partId).toBe('copy:upper')
  expect(mapped.controlPoints).toBe(root.controlPoints)
  const removed = mapDocumentReferences({
    document,
    keepPart: (id) => id !== 'upper',
    rename: (id) => id,
  })
  expect(parseDocumentValue(removed).ok).toBe(true)
  const retained = removed.scene!.roots[0]!
  if (retained.kind !== 'deformer') {
    throw new Error('Expected retained deformer')
  }
  expect(retained.boneWeights).toEqual([])
  expect(retained.binding!.steps[0]!.shape.vertexInfluences).toEqual([])
  expect(retained.binding!.rest.boneWeights).toEqual([])
})
