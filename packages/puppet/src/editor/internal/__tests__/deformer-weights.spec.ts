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
const options = {boneIndex: 0, nodeId: 'bone', partId: 'mesh-preview', vertexIndex: 0, weight: 0.25}

test('should assign normalized weights, round trip them, and restore automatic weights', () => {
  const document = setDeformerVertexWeight({...options, document: createDocument()})!
  expect(getSceneNode(document, 'bone')).toMatchObject({
    boneWeights: [{partId: 'mesh-preview', vertexIndex: 0, weights: [0.25, 0.75]}],
  })
  const parsed = parseDocument(serializeDocument(document))
  expect(parsed.ok).toBe(true)
  if (parsed.ok) {
    expect(getSceneNode(parsed.document, 'bone')).toMatchObject({
      boneWeights: [{weights: [0.25, 0.75]}],
    })
  }
  const reset = setDeformerVertexWeight({...options, document, weight: undefined})!
  expect(getSceneNode(reset, 'bone')).toMatchObject({boneWeights: []})
})

test('should reject invalid vertices, weights and locked nodes', () => {
  const document = createDocument()
  for (const invalid of [
    {vertexIndex: -1},
    {vertexIndex: 99999},
    {boneIndex: 20},
    {weight: Number.NaN},
    {weight: 1.1},
    {partId: 'missing'},
  ]) {
    expect(setDeformerVertexWeight({...options, document, ...invalid})).toBeUndefined()
  }
  const locked = {
    ...document,
    scene: {roots: document.scene!.roots.map((node) => ({...node, locked: true}))},
  }
  expect(setDeformerVertexWeight({...options, document: locked})).toBeUndefined()
})

test('should assign a batch of normalized vertex weights in one document update', async () => {
  const {setDeformerVertexWeights} = await import('../deformer-weights')
  const document = createDocument()
  const result = setDeformerVertexWeights({
    changes: [0, 1, 2].map((vertexIndex) => ({
      partId: 'mesh-preview',
      boneIndex: 1,
      vertexIndex,
      weight: 0.8,
    })),
    document,
    nodeId: 'bone',
  })!
  const node = getSceneNode(result, 'bone')
  expect(node?.kind === 'deformer' && node.boneWeights?.map((entry) => entry.weights[1])).toEqual([
    0.8, 0.8, 0.8,
  ])
  expect(getSceneNode(document, 'bone')).toMatchObject({boneWeights: undefined})
})

test('should store and round trip zero and partial influence for a single bone', () => {
  for (const weight of [0, 0.25, 1]) {
    const document = setDeformerVertexWeight({
      ...options,
      document: createBoneDeformer(createDemoDocument(), ['mesh-preview'])!,
      weight,
    })!
    expect(getSceneNode(document, 'bone')).toMatchObject({boneWeights: [{weights: [weight]}]})
    const parsed = parseDocument(serializeDocument(document))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(getSceneNode(parsed.document, 'bone')).toMatchObject({
        boneWeights: [{weights: [weight]}],
      })
    }
  }
})

test('should round trip and reset the influence mask for pin, curve and grid deformers', async () => {
  const {convertSceneContainers} = await import('../container-conversion')
  for (const targetKind of ['pin', 'curve', 'deformer'] as const) {
    const source = convertSceneContainers({
      document: createDemoDocument(),
      nodeIds: ['shapes'],
      targetKind,
    })!
    const options = {
      document: source,
      nodeId: 'shapes',
      boneIndex: 0,
      partId: 'shape-circle',
      vertexIndex: 0,
      weight: 0.25,
    }
    const weighted = setDeformerVertexWeight(options)!
    expect(getSceneNode(weighted, 'shapes')).toMatchObject({
      vertexInfluences: [{partId: 'shape-circle', vertexIndex: 0, weight: 0.25}],
    })
    const parsed = parseDocument(serializeDocument(weighted))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(getSceneNode(parsed.document, 'shapes')).toMatchObject({
        vertexInfluences: [{weight: 0.25}],
      })
    }
    expect(
      getSceneNode(
        setDeformerVertexWeight({...options, document: weighted, weight: undefined})!,
        'shapes',
      ),
    ).toMatchObject({vertexInfluences: []})
  }
})
