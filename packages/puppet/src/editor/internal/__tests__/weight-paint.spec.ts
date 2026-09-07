import {expect, test} from 'vitest'
import {
  createDemoDocument,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
} from '../../../player'
import {createBoneDeformer, editBoneRest} from '../bone-editing'
import {getSceneNode} from '../scene-graph'
import {setDeformerVertexWeight} from '../deformer-weights'
import {createWeightPaintStroke} from '../weight-paint'

const createDocument = () => {
  let document = editBoneRest({
    document: createBoneDeformer(createDemoDocument(), ['mesh-preview'])!,
    nodeId: 'bone',
    operation: 'append',
    point: {x: 900, y: 240},
  })!
  for (const vertexIndex of [0, 1, 2, 3, 4]) {
    document = setDeformerVertexWeight({
      document,
      boneIndex: 0,
      nodeId: 'bone',
      partId: 'mesh-preview',
      vertexIndex,
      weight: 0.5,
    })!
  }
  return document
}
const vertices = [0, 1, 2, 3, 4].map((vertexIndex) => ({
  partId: 'mesh-preview',
  vertexIndex,
  x: vertexIndex * 20,
  y: 0,
}))
const weight = (document: PuppetDocument, index: number) =>
  (getSceneNode(document, 'bone') as PuppetSceneDeformerNode).boneWeights!.find(
    (entry) => entry.vertexIndex === index,
  )!.weights[0]!

test('should cover the stroke path without event-rate-dependent buildup', () => {
  const document = createDocument()
  const stroke = createWeightPaintStroke({
    boneIndex: 0,
    document,
    nodeId: 'bone',
    mode: 'add',
    radius: 10,
    strength: 0.5,
    vertices,
  })!
  stroke.paint({x: -20, y: 0})
  const result = stroke.paint({x: 100, y: 0})!
  for (const index of [0, 1, 2, 3, 4]) {
    expect(weight(result, index)).toBeCloseTo(0.75)
  }
  expect(stroke.paint({x: 100, y: 0})).toBeUndefined()
  expect(weight(document, 0)).toBe(0.5)
})

test('should subtract with radial falloff without touching vertices outside the brush', () => {
  const stroke = createWeightPaintStroke({
    boneIndex: 0,
    document: createDocument(),
    nodeId: 'bone',
    mode: 'subtract',
    radius: 30,
    strength: 1,
    vertices,
  })!
  const result = stroke.paint({x: 0, y: 0})!
  expect(weight(result, 0)).toBeCloseTo(0)
  expect(weight(result, 1)).toBeGreaterThan(0)
  expect(weight(result, 1)).toBeLessThan(0.5)
  expect(weight(result, 2)).toBe(0.5)
})

test('should smooth using connected mesh neighbors from the initial stroke snapshot', () => {
  const document = setDeformerVertexWeight({
    document: createDocument(),
    boneIndex: 0,
    nodeId: 'bone',
    partId: 'mesh-preview',
    vertexIndex: 4,
    weight: 1,
  })!
  const stroke = createWeightPaintStroke({
    boneIndex: 0,
    document,
    nodeId: 'bone',
    mode: 'smooth',
    radius: 5,
    strength: 1,
    vertices,
  })!
  expect(weight(stroke.paint({x: 80, y: 0})!, 4)).toBeCloseTo(0.5)
})

test('should reject invalid brush settings and exclude locked parts', () => {
  const document = createDocument()
  const options = {
    boneIndex: 0,
    document,
    nodeId: 'bone',
    mode: 'add' as const,
    radius: 10,
    strength: 1,
    vertices,
  }
  expect(createWeightPaintStroke({...options, radius: 0})).toBeUndefined()
  expect(createWeightPaintStroke({...options, strength: NaN})).toBeUndefined()
  expect(createWeightPaintStroke({...options, boneIndex: 9})).toBeUndefined()
  const node = getSceneNode(document, 'bone') as PuppetSceneDeformerNode
  const locked = {
    ...document,
    scene: {roots: [{...node, children: node.children.map((child) => ({...child, locked: true}))}]},
  }
  expect(createWeightPaintStroke({...options, document: locked})).toBeUndefined()
})

test('should paint a non-bone deformer mask without creating bone weights', () => {
  const initial = createDocument()
  const document = {
    ...initial,
    scene: {
      roots: initial.scene!.roots.map((node) =>
        node.id === 'bone'
          ? {
              ...node,
              boneRestPoints: undefined,
              boneWeights: undefined,
              controlPoints: [0, 0, 960, 0, 0, 720, 960, 720],
            }
          : node,
      ),
    },
  }
  const stroke = createWeightPaintStroke({
    document,
    boneIndex: 0,
    nodeId: 'bone',
    radius: 10,
    vertices,
    mode: 'subtract',
    strength: 0.5,
  })
  expect(stroke).toBeDefined()
  const result = stroke!.paint({x: 0, y: 0})!
  expect(getSceneNode(result, 'bone')).toMatchObject({
    boneWeights: undefined,
    vertexInfluences: [{partId: 'mesh-preview', vertexIndex: 0, weight: 0.5}],
  })
})
