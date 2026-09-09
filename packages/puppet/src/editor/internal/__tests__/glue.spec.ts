import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {addGlue, canGlueVertex, updateGlue} from '../glue'
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
