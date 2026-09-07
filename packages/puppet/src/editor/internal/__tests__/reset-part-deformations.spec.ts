import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {createBoneDeformer, editBoneRest} from '../bone-editing'
import {getSceneNode} from '../scene-graph'
import {setDeformerVertexWeight} from '../deformer-weights'
const createDocument = () =>
  editBoneRest({
    document: createBoneDeformer(createDemoDocument(), ['mesh-preview'])!,
    nodeId: 'bone',
    operation: 'append',
    point: {x: 900, y: 240},
  })!
const options = {nodeId: 'bone', partId: 'mesh-preview', boneIndex: 0, vertexIndex: 0, weight: 0.25}
test('should clear weights on mesh topology replacement, including preserved binding steps', async () => {
  const {resetPartDeformations} = await import('../reset-part-deformations')
  const document = setDeformerVertexWeight({...options, document: createDocument()})!
  const posed = editBoneRest({
    document,
    index: 0,
    nodeId: 'bone',
    operation: 'move',
    point: {x: 10, y: 240},
  })!
  const reset = resetPartDeformations(posed, options.partId, posed.parts[0]!.mesh.vertices)
  const node = getSceneNode(reset, 'bone')
  expect(node?.kind === 'deformer' && node.boneWeights).toEqual([])
  expect(parseDocument(serializeDocument(reset)).ok).toBe(true)
})
