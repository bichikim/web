import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument} from '../index'
import {createBoneDeformer, editBoneRest} from '../../editor/internal/bone-editing'
import {setDeformerVertexWeight} from '../../editor/internal/deformer-weights'
const createDocument = () =>
  editBoneRest({
    document: createBoneDeformer(createDemoDocument(), ['mesh-preview'])!,
    nodeId: 'bone',
    operation: 'append',
    point: {x: 900, y: 240},
  })!
const options = {nodeId: 'bone', partId: 'mesh-preview', boneIndex: 0, vertexIndex: 0, weight: 0.25}
test('should reject malformed serialized weights', () => {
  const document = setDeformerVertexWeight({...options, document: createDocument()})!
  for (const weights of [[-1, 2], [0.3, 0.3], [0, 0], [1], [Infinity, 0]]) {
    const scene = {
      roots: document.scene!.roots.map((node) =>
        node.id === 'bone'
          ? {...node, boneWeights: [{partId: 'mesh-preview', vertexIndex: 0, weights}]}
          : node,
      ),
    }
    expect(parseDocument(JSON.stringify({...document, scene})).ok).toBe(false)
  }
})

test('should reject malformed influence masks', async () => {
  const {convertSceneContainers} = await import('../../editor/internal/container-conversion')
  const document = convertSceneContainers({
    document: createDemoDocument(),
    nodeIds: ['shapes'],
    targetKind: 'pin',
  })!
  const entry = {partId: 'shape-circle', vertexIndex: 0, weight: 0.5}
  for (const vertexInfluences of [
    [{...entry, weight: -1}],
    [{...entry, weight: 2}],
    [{...entry, weight: null}],
    [{...entry, vertexIndex: -1}],
    [{...entry, vertexIndex: 0.5}],
    [{...entry, partId: ''}],
    [entry, entry],
  ]) {
    const scene = {
      roots: document.scene!.roots.map((node) =>
        node.id === 'shapes' ? {...node, vertexInfluences} : node,
      ),
    }
    expect(parseDocument(JSON.stringify({...document, scene})).ok).toBe(false)
  }
})
