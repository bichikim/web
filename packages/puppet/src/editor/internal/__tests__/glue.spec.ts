import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {addGlue, canGlueVertex, setGlueKeyform, updateGlue} from '../glue'
import {setSceneNodeState} from '../scene-graph'

const first = {partId: 'mesh-preview', vertexIndex: 0}
const second = {partId: 'shape-diamond', vertexIndex: 0}
test('should connect boundary vertices and round trip editable weights', () => {
  const joined = addGlue(createDemoDocument(), first, second)!
  expect(joined.glue).toHaveLength(1)
  const edited = updateGlue(joined, joined.glue![0]!.id, {strength: 0.4, weight: 0.8})!
  expect(parseDocument(serializeDocument(edited)).ok).toBe(true)
  expect(updateGlue(edited, joined.glue![0]!.id, null)!.glue).toEqual([])
})
test('should reject interior points, reused vertices, self connections and locked endpoints', () => {
  const document = createDemoDocument()
  expect(canGlueVertex(document, {...first, vertexIndex: 4})).toBe(false)
  expect(addGlue(document, first, {...first, vertexIndex: 1})).toBeUndefined()
  const joined = addGlue(document, first, second)!
  expect(addGlue(joined, first, {...second, vertexIndex: 1})).toBeUndefined()
  const locked = setSceneNodeState({document, locked: true, nodeId: first.partId})!
  expect(addGlue(locked, first, second)).toBeUndefined()
  expect(updateGlue(joined, joined.glue![0]!.id, {strength: 1, weight: NaN})).toBeUndefined()
})

const keyedDocument = () => {
  const document = addGlue(createDemoDocument(), first, second)!
  return setGlueKeyform({
    bindingId: document.parameterBindings![0]!.id,
    changes: {strength: 0.3, weight: 0.2},
    document,
    glueId: 'glue-1',
    values: [0, 0],
  })!
}
test('should save only the selected keyform and round trip Glue controls', () => {
  const document = keyedDocument()
  expect(document.glue![0]).toMatchObject({strength: 1, weight: 0.5})
  const parsed = parseDocument(serializeDocument(document))
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) {
    throw new Error('Expected valid document')
  }
  const samples = parsed.document.parameterBindings![0]!.keyforms.flatMap((form) =>
    form.parts.flatMap((part) => part.glue ?? []),
  )
  expect(samples).toEqual([{id: 'glue-1', strength: 0.3, weight: 0.2}])
})
test('should reject missing keyforms, locked endpoints and invalid values', () => {
  const document = keyedDocument()
  const options = {
    bindingId: document.parameterBindings![0]!.id,
    changes: {strength: 1, weight: 0.5},
    document,
    glueId: 'glue-1',
    values: [0, 0] as const,
  }
  expect(setGlueKeyform({...options, values: [1, 1]})).toBeUndefined()
  expect(setGlueKeyform({...options, changes: {strength: -1, weight: 0.5}})).toBeUndefined()
  expect(
    setGlueKeyform({
      ...options,
      document: setSceneNodeState({document, locked: true, nodeId: second.partId})!,
    }),
  ).toBeUndefined()
})
test('should remove stored samples when unlinking a connection', () => {
  const document = updateGlue(keyedDocument(), 'glue-1', null)!
  expect(
    document.parameterBindings![0]!.keyforms.flatMap((form) =>
      form.parts.flatMap((part) => part.glue ?? []),
    ),
  ).toEqual([])
  expect(parseDocument(serializeDocument(document)).ok).toBe(true)
})
