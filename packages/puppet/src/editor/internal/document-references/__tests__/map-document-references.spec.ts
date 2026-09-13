import {expect, test} from 'vitest'
import example from '../../../../../examples/rotation-skinning.json'
import {parseDocumentValue} from '../../../../player/parse-document'
import {mapDocumentReferences} from '../map-document-references'

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
    bounds: root.bounds,
    deformerType: undefined,
    boneRestPoints: root.boneRestPoints,
    columns: root.columns,
    controlPoints: root.controlPoints,
    rows: root.rows,
    boneWeights: [{partId: 'upper', vertexIndex: 0, weights: [1]}],
    vertexInfluences: [{partId: 'upper', vertexIndex: 0, weight: 0.5}],
  }
  const document = {
    ...parsed.document,
    parameters: [],
    parts: [parsed.document.parts[0]!],
    motions: [],
    parameterBindings: [],
    scene: {
      roots: [
        {
          ...root,
          ...shape,
          binding: {rest: shape, steps: [{shape, rest: shape}]},
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
