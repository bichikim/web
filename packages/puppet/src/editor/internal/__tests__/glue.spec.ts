import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {addGlue, canGlueVertex, setGlueKeyform, updateGlue} from '../glue'
import {insertParameterKeyform} from '../parameter-keyforms'
import {setSceneNodeState} from '../scene-graph'

const first = {partId: 'mesh-preview', vertexIndex: 0}
const second = {partId: 'shape-diamond', vertexIndex: 0}
const directDocument = () => {
  const document = addGlue(createDemoDocument(), first, second)!
  return {
    ...document,
    parameterBindings: [
      {
        id: 'direct',
        interpolation: 'grid' as const,
        keyforms: [-30, 30].map((value) => ({
          glue: [{id: 'glue-1', strength: (value + 30) / 60, weight: 0.5}],
          parts: [],
          values: [value] as const,
        })),
        parameterIds: ['angle-x'] as const,
        targetGlueIds: ['glue-1'],
      },
    ],
  }
}

test('should edit a direct Glue keyform and remove its references when unlinked', () => {
  const document = setGlueKeyform({
    bindingId: 'direct',
    changes: {strength: 0.2, weight: 0.7},
    document: directDocument(),
    glueId: 'glue-1',
    values: [-30],
  })!
  expect(document).toBeDefined()
  expect(document.parameterBindings![0]!.keyforms[0]!.glue).toEqual([
    {id: 'glue-1', strength: 0.2, weight: 0.7},
  ])
  expect(parseDocument(serializeDocument(document)).ok).toBe(true)
  const removed = updateGlue(document, 'glue-1', null)!
  expect(removed.parameterBindings![0]!.targetGlueIds).toEqual([])
  expect(removed.parameterBindings![0]!.keyforms.every((form) => form.glue?.length === 0)).toBe(
    true,
  )
  expect(parseDocument(serializeDocument(removed)).ok).toBe(true)
})

test('should insert interpolated keys into a Glue-only binding', () => {
  const document = insertParameterKeyform({
    bindingId: 'direct',
    document: directDocument(),
    values: [0],
  })!
  expect(document).toBeDefined()
  expect(document.parameterBindings![0]!.keyforms[1]!.glue).toEqual([
    {id: 'glue-1', strength: 0.5, weight: 0.5},
  ])
  expect(parseDocument(serializeDocument(document)).ok).toBe(true)
})

test('should preserve a repeating Glue binding when inserting at its wrapped maximum', () => {
  const source = directDocument()
  const document = {
    ...source,
    parameterBindings: source.parameterBindings.map((binding) => ({
      ...binding,
      keyforms: binding.keyforms.map((form, index) => ({
        ...form,
        values: [index === 0 ? -30 : 0] as const,
      })),
    })),
    parameters: source.parameters!.map((parameter) => ({...parameter, repeat: true})),
  }
  const inserted = insertParameterKeyform({bindingId: 'direct', document, values: [30]})!
  expect(inserted.parameterBindings![0]!.keyforms[2]!.glue![0]!.strength).toBe(0)
  expect(parseDocument(serializeDocument(inserted)).ok).toBe(true)
})
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

test('should edit an imported sequential connection even when another connection shares its vertex', () => {
  const document = {
    ...createDemoDocument(),
    glue: [0, 1].map((vertexIndex) => ({
      first,
      id: `shared-${vertexIndex}`,
      second: {...second, vertexIndex},
      strength: 1,
      weight: 1,
    })),
    glueComposition: 'sequential' as const,
  }
  const updated = updateGlue(document, 'shared-0', {strength: 0.5, weight: 1})
  expect(updated?.glue?.[0]?.strength).toBe(0.5)
  expect(updated === undefined ? false : parseDocument(serializeDocument(updated)).ok).toBe(true)
})
