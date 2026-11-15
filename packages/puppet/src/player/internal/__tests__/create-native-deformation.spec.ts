import {expect, test} from 'vitest'
import {
  PUPPET_DOCUMENT_FORMAT,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
} from '../../document'
import {composeParameterScene} from '../../../deformation/scene'
import {applySceneNodeDeformers} from '../../../deformation/vertices'
import {createNativeDeformation} from '../create-native-deformation'
import {computeRenderFrame} from '../compute-render-frame'
import {mixMotionFrames} from '../../playback/mix-motion-frames'
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
    createNativeDeformation(createDocument({...shape, binding: {rest: shape, steps: []}})),
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
test('should update only the requested branch and refresh a previously skipped sibling when needed', () => {
  const sibling = {
    ...shape,
    children: [{id: 'other', kind: 'part' as const, locked: false, name: 'Other', visible: true}],
    id: 'sibling',
  }
  const parent = {...shape, children: [shape, sibling], id: 'parent'}
  const document: PuppetDocument = {
    ...createDocument(parent),
    parameterBindings: [
      {
        id: 'move-parent',
        keyforms: [0, 1].map((value) => ({
          deformers: [
            {
              controlPoints: parent.controlPoints.map((coordinate) => coordinate + value),
              kind: 'deformer',
              nodeId: 'parent',
            },
          ],
          parts: [],
          values: [value] as const,
        })),
        parameterIds: ['p'],
        targetDeformerIds: ['parent'],
      },
    ],
  }
  const native = createNativeDeformation(document)!
  for (const [id, p] of [
    ['part', 0.2],
    ['other', 0.8],
    ['part', 0.5],
  ] as const) {
    const expected = new Map([[id, [0.3, 0.6]]])
    applySceneNodeDeformers(composeParameterScene(document, {p}).roots, expected)
    const actual = new Map([[id, [0.3, 0.6]]])
    native.apply({p}, actual)
    expect(actual).toEqual(expected)
  }
})

test('should retain precision across changing vertex inputs and caller buffers', () => {
  const document = createDocument({
    ...shape,
    controlPoints: [0.123, 0.234, 1.321, 0.12, 0.03, 1.12, 1.11, 1.43],
  })
  const native = createNativeDeformation(document)!
  const source = [0.3333333333333, 0.7142857142857, -0.12, 1.25]
  const previous: number[] = []
  for (const coordinates of [new Float32Array(source), [...source], [0.1, 0.3], [], [...source]]) {
    const expected = new Map([
      ['part', Array.isArray(coordinates) ? [...coordinates] : new Float32Array(coordinates)],
    ])
    applySceneNodeDeformers(composeParameterScene(document, {}).roots, expected)
    const actual = new Map([['part', coordinates]])
    native.apply({}, actual)
    expect(actual).toEqual(expected)
    // Downstream Glue owns the result and can modify it before the next evaluation.
    if (coordinates.length > 0) {
      previous.push(coordinates[0]!)
      coordinates[0] = 99
    }
  }
  expect(previous[1]).toBe(previous[3])
  expect(previous[0]).not.toBe(previous[1])
})

test('should preserve mixed parent and document-space branches across changing shared ancestors', () => {
  const legacy: PuppetSceneDeformerNode = {
    ...shape,
    children: [{...shape.children[0]!, id: 'legacy-part'}],
    controlPoints: [0.1, 0.2, 1.2, 0.3, 0.2, 1.1, 1.3, 1.4],
    coordinateSpace: undefined,
    id: 'legacy',
    vertexInfluences: [],
  }
  const parent = {...shape, children: [shape, legacy], id: 'parent'}
  const document: PuppetDocument = {
    ...createDocument(parent),
    parameterBindings: [
      {
        id: 'move',
        keyforms: [0, 1].map((p) => ({
          deformers: [
            {
              controlPoints: parent.controlPoints.map((value) => value + p),
              kind: 'deformer',
              nodeId: parent.id,
            },
          ],
          parts: [],
          values: [p],
        })),
        parameterIds: ['p'],
        targetDeformerIds: [parent.id],
      },
    ],
  }
  const native = createNativeDeformation(document)
  expect(native).toBeDefined()
  for (const p of [0, 0.3, 1, 0.3, 0]) {
    const expected = new Map([...createVertices(), ['legacy-part', [0.17, 0.29, 0.7, 0.9]]])
    const actual = new Map([...expected].map(([id, vertices]) => [id, [...vertices]]))
    applySceneNodeDeformers(composeParameterScene(document, {p}).roots, expected)
    native!.apply({p}, actual)
    expect(actual).toEqual(expected)
  }
})

test('should preserve nested document-space grids before applying a moving parent warp', () => {
  const local: PuppetSceneDeformerNode = {
    ...shape,
    columns: 2,
    controlPoints: [0, 0, 0.4, 0.1, 1, 0, 0.1, 0.5, 0.6, 0.6, 1.1, 0.5, 0, 1, 0.5, 1.2, 1, 1],
    coordinateSpace: undefined,
    rows: 2,
  }
  const parent = {
    ...shape,
    children: [{...local, children: [local], id: 'outer-local'}],
    controlPoints: [0.1, 0.3, 1.2, 0.2, 0.2, 1.3, 1.3, 1.4],
    id: 'parent',
  }
  const document: PuppetDocument = {
    ...createDocument(parent),
    parameterBindings: [
      {
        id: 'move',
        keyforms: [0, 1].map((p) => ({
          deformers: [
            {
              controlPoints: parent.controlPoints.map((value) => value + p),
              kind: 'deformer',
              nodeId: parent.id,
            },
          ],
          parts: [],
          values: [p],
        })),
        parameterIds: ['p'],
        targetDeformerIds: [parent.id],
      },
    ],
  }
  expect(createNativeDeformation(document)).toBeDefined()
  compare(document, [0, 0.3, 1, 0.3, 0])
})

test('should preserve spatial projection and render plans beside a compiled branch', () => {
  const spatial: PuppetSceneDeformerNode = {
    ...shape,
    children: [{...shape.children[0]!, id: 'spatial-part'}],
    deformerType: 'spatial',
    id: 'volume',
    spatialRotation: [0, 0.4, 0],
  }
  const part = {
    id: 'part',
    mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
    texture: {height: 1, src: '', width: 1},
  }
  const document: PuppetDocument = {
    ...createDocument(),
    parts: [
      part,
      {
        ...part,
        id: 'spatial-part',
        spatial: {
          controlPoints: [0, 0, 0.1, 1, 0, 0.2, 0, 1, 0.3],
          groupId: spatial.id,
          origin: [0, 0, 0],
        },
      },
    ],
    scene: {roots: [shape, spatial]},
  }
  const native = createNativeDeformation(document)
  expect(native).toBeDefined()
  const createBuffers = () =>
    new Map(document.parts.map((part) => [part.id, new Float32Array(part.mesh.vertices)]))
  const expected = createBuffers()
  const actual = createBuffers()
  const options = {
    document,
    mix: mixMotionFrames({document, frames: [], parameterValues: {}}),
    parameterValues: {},
  }
  const expectedFrame = computeRenderFrame({...options, verticesByPartId: expected})
  const actualFrame = computeRenderFrame({...options, native, verticesByPartId: actual})
  expect(actual).toEqual(expected)
  expect(actualFrame).toEqual(expectedFrame)
})

test('should retain external skinning frames when only the skinned branch uses the general evaluator', () => {
  const identity = {x: 0, xx: 1, xy: 0, y: 0, yx: 0, yy: 1}
  const rotation: PuppetSceneDeformerNode = {
    ...shape,
    boneRestPoints: [0, 0, 1, 0],
    controlPoints: [2, 0, 3, 0],
    deformerType: 'rotation',
    id: 'bone',
  }
  const document: PuppetDocument = {
    ...createDocument(),
    scene: {
      roots: [
        rotation,
        {
          ...shape.children[0]!,
          id: 'skinned',
          kind: 'part',
          skinning: {
            bind: identity,
            influences: [{inverseBind: identity, nodeId: rotation.id, weights: [1]}],
          },
        },
      ],
    },
  }
  const native = createNativeDeformation(document)
  expect(native).toBeDefined()
  const expected = new Map([...createVertices(), ['skinned', [0.2, 0.3]]])
  const actual = new Map([...expected].map(([id, vertices]) => [id, [...vertices]]))
  applySceneNodeDeformers(composeParameterScene(document, {}).roots, expected)
  native!.apply({}, actual)
  expect(actual).toEqual(expected)
  expect(actual.get('skinned')).not.toEqual([0.2, 0.3])
})
