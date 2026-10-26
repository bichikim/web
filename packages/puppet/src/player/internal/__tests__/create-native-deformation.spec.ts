import {expect, test} from 'vitest'
import {
  PUPPET_DOCUMENT_FORMAT,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
} from '../../document'
import {composeParameterScene} from '../../../deformation/scene'
import {applySceneNodeDeformers} from '../../../deformation/vertices'
import {createNativeDeformation} from '../create-native-deformation'
const shape: PuppetSceneDeformerNode = {
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [{id: 'part', kind: 'part', locked: false, name: 'Part', visible: true}],
  columns: 1,
  controlPoints: [0, 0, 1, 0, 0, 1, 1, 1],
  coordinateSpace: 'parent',
  id: 'warp',
  interpolation: 'bilinear',
  kind: 'deformer',
  locked: false,
  name: 'Warp',
  rows: 1,
  visible: true,
}
const createDocument = (root = shape): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'Position'}],
  parts: [],
  scene: {roots: [root]},
  version: 1,
  viewport: {height: 1, width: 1},
})
const createVertices = () => new Map([['part', [-0.2, 0.1, 0.3, 0.8, 1.2, 0.6]]])
const compare = (document: PuppetDocument, inputs: ReadonlyArray<number>) => {
  const native = createNativeDeformation(document)!
  let before: Map<string, number[]> | undefined
  let snapshot: ReadonlyArray<number> | undefined
  for (const p of inputs) {
    const expected = createVertices()
    applySceneNodeDeformers(composeParameterScene(document, {p}).roots, expected)
    const actual = createVertices()
    native.apply({p}, actual)
    expect(actual).toEqual(expected)
    if (before === undefined) {
      before = actual
      snapshot = [...actual.get('part')!]
    }
  }
  expect(before!.get('part')).toEqual(snapshot)
}
test('should preserve nested grid results across changed parents, reused inputs and old snapshots', () => {
  const parent = {
    ...shape,
    children: [shape],
    controlPoints: [1, 2, 3, 2, 1, 4, 3, 4],
    id: 'parent',
  }
  const document: PuppetDocument = {
    ...createDocument(parent),
    parameterBindings: [
      {
        id: 'move',
        interpolation: 'grid',
        keyforms: [0, 1].map((p) => ({
          deformers: [
            {
              controlPoints: parent.controlPoints.map((x) => x + p),
              kind: 'deformer',
              nodeId: 'parent',
            },
          ],
          parts: [],
          values: [p],
        })),
        parameterIds: ['p'],
        targetDeformerIds: ['parent'],
      },
    ],
  }
  compare(document, [0, 0.25, 0.75, 0.25, 0])
})
test('should preserve rotation inheritance, reflection and scale inside a moving warp', () => {
  const rotation: PuppetSceneDeformerNode = {
    ...shape,
    boneRestPoints: [0, 0, 1, 0],
    children: [shape],
    controlPoints: [0.25, 0.5, 1.25, 0.5],
    deformerType: 'rotation',
    id: 'rotation',
    interpolation: undefined,
  }
  const parent = {...shape, children: [rotation], id: 'parent'}
  const document: PuppetDocument = {
    ...createDocument(parent),
    parameterBindings: [
      {
        id: 'pose',
        interpolation: 'grid',
        keyforms: [0, 1].map((p) => ({
          deformers: [
            {
              controlPoints: [0, 0, 1 + p, 0.2, 0, 1, 1 + p, 1.3],
              kind: 'deformer',
              nodeId: 'parent',
            },
            {
              controlPoints: rotation.controlPoints,
              kind: 'deformer',
              nodeId: 'rotation',
              rotationReflection: [p === 1, false],
              rotationScale: 1 + p,
            },
          ],
          parts: [],
          values: [p],
        })),
        parameterIds: ['p'],
        targetDeformerIds: ['parent', 'rotation'],
      },
    ],
  }
  compare(document, [0, 0.5, 1, 0])
})
test('should defer unsupported bindings and vertex-dependent rigs to the general evaluator', () => {
  expect(
    createNativeDeformation(createDocument({...shape, coordinateSpace: undefined})),
  ).toBeUndefined()
  expect(createNativeDeformation(createDocument({...shape, vertexInfluences: []}))).toBeUndefined()
  expect(createNativeDeformation(createDocument({...shape, pins: []}))).toBeUndefined()
  expect(
    createNativeDeformation(
      createDocument({
        ...shape,
        children: [
          {
            ...shape.children[0]!,
            kind: 'part',
            skinning: {bind: {x: 0, xx: 1, xy: 0, y: 0, yx: 0, yy: 1}, influences: []},
          },
        ],
      }),
    ),
  ).toBeUndefined()
})
test('should use the general evaluator for a document containing spatial geometry', () => {
  const document: PuppetDocument = {
    ...createDocument(),
    parts: [
      {
        id: 'part',
        mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
        spatial: {controlPoints: [0, 0, 0, 1, 0, 0, 0, 1, 0], origin: [0, 0, 0]},
        texture: {height: 1, src: '', width: 1},
      },
    ],
  }
  expect(createNativeDeformation(document)).toBeUndefined()
})
