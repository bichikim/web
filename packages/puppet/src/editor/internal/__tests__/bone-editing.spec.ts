import {convertSceneContainers} from '../container-conversion'
import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, type PuppetSceneDeformerNode} from '../../../player'
import {createBoneDeformer, editBoneRest} from '../bone-editing'
import {getSceneNode} from '../scene-graph'
import {addParameter} from '../parameter-keyforms'

test('should create a bone chain, extend its bind pose, and round trip the document', () => {
  const document = createBoneDeformer(createDemoDocument(), ['mesh-preview'])!
  const node = getSceneNode(document, 'bone')!
  expect(node.kind === 'deformer' && node.boneRestPoints).toHaveLength(4)
  const next = editBoneRest({
    document,
    nodeId: 'bone',
    operation: 'append',
    point: {x: 700, y: 300},
  })!
  const edited = getSceneNode(next, 'bone')!
  expect(edited.kind === 'deformer' && edited.boneRestPoints).toHaveLength(6)
  expect(parseDocument(JSON.stringify(next)).ok).toBe(true)
  const bound = addParameter({document: next, nodeIds: ['bone']})!
  expect(
    editBoneRest({
      document: bound.document,
      nodeId: 'bone',
      operation: 'append',
      point: {x: 800, y: 400},
    }),
  ).toBeUndefined()
})

test('should project an inserted joint onto its bone without changing the endpoints', () => {
  const document = createBoneDeformer(createDemoDocument(), ['mesh-preview'])!
  const next = editBoneRest({
    document,
    index: 1,
    nodeId: 'bone',
    operation: 'insert',
    point: {x: 320, y: 250},
  })!
  const node = getSceneNode(next, 'bone')!
  expect(node.kind === 'deformer' && node.boneRestPoints).toEqual([0, 240, 320, 240, 640, 240])
  expect(parseDocument(JSON.stringify(next)).ok).toBe(true)
  expect(
    editBoneRest({document, index: 1, nodeId: 'bone', operation: 'insert', point: {x: 0, y: 240}}),
  ).toBeUndefined()
  const bound = addParameter({document, nodeIds: ['bone']})!
  expect(
    editBoneRest({
      document: bound.document,
      index: 1,
      nodeId: 'bone',
      operation: 'insert',
      point: {x: 320, y: 240},
    }),
  ).toBeUndefined()
})

test('should preserve the rotation pivot layout without allowing extra joints', () => {
  const document = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'rotation',
  })!
  for (const operation of ['append', 'insert', 'remove'] as const) {
    expect(
      editBoneRest({document, nodeId: 'shapes', index: 1, operation, point: {x: 100, y: 100}}),
    ).toBeUndefined()
  }
  const moved = editBoneRest({
    document,
    nodeId: 'shapes',
    index: 0,
    operation: 'move',
    point: {x: 100, y: 100},
  })!
  expect(parseDocument(JSON.stringify(moved)).ok).toBe(true)
  const node = getSceneNode(moved, 'shapes') as PuppetSceneDeformerNode
  expect(node.deformerType).toBe('rotation')
  expect(node.binding?.rest.deformerType).toBe('rotation')
})
