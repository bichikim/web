import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test} from 'vitest'
import {
  PUPPET_DOCUMENT_FORMAT,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
} from '../../../../document'
import {parseDocumentValue} from '../../../../parse-document'
import {createNativeDeformation} from '../../../create-native-deformation'
import {createWasmTransform} from '../create-transform'

const binary = readFileSync(resolve(import.meta.dirname, '../kernel.wasm'))
const module = new WebAssembly.Module(binary)
const shape: PuppetSceneDeformerNode = {
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [{id: 'part', kind: 'part', locked: false, name: 'Part', visible: true}],
  columns: 2,
  controlPoints: [0, 0, 0.6, -0.1, 1, 0, -0.1, 0.5, 0.5, 0.6, 1, 0.5, 0, 1, 0.4, 1.1, 1, 1],
  coordinateSpace: 'parent',
  id: 'warp',
  interpolation: 'bilinear',
  kind: 'deformer',
  locked: false,
  name: 'Warp',
  rows: 2,
  visible: true,
}
const documentFor = (root = shape): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
  parts: [],
  scene: {roots: [root]},
  version: 1,
  viewport: {height: 1, width: 1},
})
const create = (document: PuppetDocument) => {
  const factory = createWasmTransform(document, new WebAssembly.Instance(module))
  expect(factory).toBeDefined()
  return createNativeDeformation(document, factory)!
}

test.each(['bilinear', 'triangles', 'triangles-mirrored'] as const)(
  'should retain %s shared interior and exterior cells through parent updates',
  (interpolation) => {
    const child = {...shape, interpolation}
    const parent = {...shape, children: [child], id: 'parent'}
    const document: PuppetDocument = {
      ...documentFor(parent),
      parameterBindings: [
        {
          id: 'move',
          interpolation: 'grid',
          keyforms: [0, 1].map((value) => ({
            deformers: [parent, child].map((node) => ({
              controlPoints: node.controlPoints.map((rest, index) => rest + value / (index + 3)),
              kind: 'deformer' as const,
              nodeId: node.id,
            })),
            parts: [],
            values: [value],
          })),
          parameterIds: ['p'],
          targetDeformerIds: [parent.id, child.id],
        },
      ],
    }
    const reference = createNativeDeformation(document)!
    const candidate = create(document)
    const coordinates = [0.1, 0.2, 0.2, 0.1, -3, -4, -4, -3, 3, 4, 4, 3, -3, 4, -4, 3, -0, 0]
    for (const p of [0, 0.25, 1, 0.25, 0]) {
      const actual = new Map([['part', [...coordinates]]])
      const expected = new Map([['part', [...coordinates]]])
      reference.apply({p}, expected)
      candidate.apply({p}, actual)
      expect(actual).toEqual(expected)
    }
  },
)

test.each(['bilinear', 'triangles', 'triangles-mirrored'] as const)(
  'should preserve %s samples inside, on boundaries and beyond the virtual grid',
  (interpolation) => {
    const document = documentFor({...shape, interpolation})
    const native = createNativeDeformation(document)!
    const wasm = create(document)
    for (const source of [
      [0, 0, 0.5, 0.5, 1, 1, -0, -0],
      [-3, -4, -0.2, 0.7, 1.2, -0.1, 4, 5],
      [0.3333333333333, 0.7142857142857, -0.12, 1.25],
    ]) {
      for (const typed of [false, true]) {
        const expected = new Map([['part', typed ? new Float32Array(source) : [...source]]])
        const actual = new Map([['part', typed ? new Float32Array(source) : [...source]]])
        native.apply({}, expected)
        wasm.apply({}, actual)
        expect(actual).toEqual(expected)
      }
    }
  },
)

test('should retain nested animated grids, inherited rotation and cached results before Glue', () => {
  const rotation: PuppetSceneDeformerNode = {
    ...shape,
    boneRestPoints: [0, 0, 1, 0],
    children: [shape],
    controlPoints: [0.2, 0.3, 1.1, 0.7],
    deformerType: 'rotation',
    id: 'rotation',
  }
  const parent = {...shape, children: [rotation], id: 'parent'}
  const document: PuppetDocument = {
    ...documentFor(parent),
    parameterBindings: [
      {
        id: 'move',
        interpolation: 'grid',
        keyforms: [0, 1].map((p) => ({
          deformers: [parent, shape, rotation].map((node) => ({
            controlPoints: node.controlPoints.map(
              (value, index) => value + (index % 2 === 0 ? p / 3 : -p / 5),
            ),
            kind: 'deformer' as const,
            nodeId: node.id,
            rotationReflection: [p === 1, false] as const,
            rotationScale: 1 + p,
          })),
          parts: [],
          values: [p],
        })),
        parameterIds: ['p'],
        targetDeformerIds: ['parent', 'warp', 'rotation'],
      },
    ],
  }
  const native = createNativeDeformation(document)!
  const wasm = create(document)
  for (const p of [0, 0.25, 0.75, 1, 0.25, 0]) {
    for (const source of [[0.2, 0.3, 1.2, -0.1], [0.4, 0.5], [], [0.2, 0.3, 1.2, -0.1]]) {
      const expected = new Map([['part', new Float32Array(source)]])
      const actual = new Map([['part', new Float32Array(source)]])
      native.apply({p}, expected)
      wasm.apply({p}, actual)
      expect(actual).toEqual(expected)
      actual.get('part')?.fill(99)
    }
  }
})

test('should keep independent memories when a later engine grows its storage', () => {
  const first = create(documentFor())
  const second = create(
    documentFor({...shape, controlPoints: shape.controlPoints.map((v) => v + 1)}),
  )
  const expected = new Map([['part', [0.2, 0.3]]])
  createNativeDeformation(documentFor())!.apply({}, expected)
  const vertices = new Map([['part', [0.2, 0.3]]])
  first.apply({}, vertices)
  second.apply({}, new Map([['part', Array.from({length: 40000}, (_, i) => i % 2)]]))
  const again = new Map([['part', [0.2, 0.3]]])
  first.apply({}, again)
  expect(again).toEqual(expected)
})

test('should retain cached part results after a sibling grows the same linear memory', () => {
  const document = documentFor({
    ...shape,
    children: [...shape.children, {...shape.children[0]!, id: 'other'}],
  })
  const native = createNativeDeformation(document)!
  const wasm = create(document)
  const expected = new Map([['part', [0.2, 0.3]]])
  native.apply({}, expected)
  wasm.apply({}, new Map([['part', [0.2, 0.3]]]))
  wasm.apply({}, new Map([['other', Array.from({length: 40000}, (_, index) => index % 2)]]))
  const actual = new Map([['part', [0.2, 0.3]]])
  wasm.apply({}, actual)
  expect(actual).toEqual(expected)
})

test.each(['bilinear', 'triangles', 'triangles-mirrored'] as const)(
  'should retain %s cell samples as local inputs repeat, parents change and buffers resize',
  (interpolation) => {
    const child = {...shape, interpolation}
    const parent = {...shape, children: [child], id: 'parent'}
    const document: PuppetDocument = {
      ...documentFor(parent),
      parameterBindings: [
        {
          id: 'parent-motion',
          interpolation: 'grid',
          keyforms: [0, 1].map((value) => ({
            deformers: [
              {
                controlPoints: parent.controlPoints.map(
                  (rest, index) => rest + value / (index + 2),
                ),
                kind: 'deformer' as const,
                nodeId: parent.id,
              },
            ],
            parts: [],
            values: [value],
          })),
          parameterIds: ['p'],
          targetDeformerIds: [parent.id],
        },
      ],
    }
    const reference = createNativeDeformation(document)!
    const candidate = create(document)
    const sources = [
      [0, -0, 0.125, 0.875, 1, 1, -3, 4],
      [0, -0, 0.125, 0.875, 1, 1, -3, 4],
      [0, 0],
      [0, -0, 0.875, 0.125, 1, 1, 4, -3],
    ]
    for (const p of [0, 0.25, 1, 0.5]) {
      for (const source of sources) {
        const expected = new Map([['part', [...source]]])
        const actual = new Map([['part', [...source]]])
        reference.apply({p}, expected)
        candidate.apply({p}, actual)
        expect(actual).toEqual(expected)
      }
    }
  },
)

test('should decline a non-grid parameter binding so the JS evaluator retains its semantics', () => {
  const document: PuppetDocument = {
    ...documentFor(),
    parameterBindings: [
      {
        id: 'non-grid',
        keyforms: [],
        parameterIds: ['p'],
        targetDeformerIds: ['warp'],
      },
    ],
  }
  expect(createWasmTransform(document, new WebAssembly.Instance(module))).toBeUndefined()
  expect(createNativeDeformation(document)).toBeDefined()
})

test('should report an incompatible compiled module instead of treating it as an unsupported rig', () => {
  const empty = new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))
  expect(() => createWasmTransform(documentFor(), new WebAssembly.Instance(empty))).toThrow(
    'Invalid deformation kernel exports',
  )
})

test.each(['bilinear', 'triangles', 'triangles-mirrored'] as const)(
  'should preserve %s signed-zero coordinates in reused cell tuples',
  (interpolation) => {
    const document = documentFor({
      ...shape,
      controlPoints: shape.controlPoints.map((value) => (value === 0 ? -0 : value)),
      interpolation,
    })
    const reference = createNativeDeformation(document)!
    const candidate = create(document)
    for (const coordinates of [
      [0, -0, -0, 0, -3, 4],
      [-0, -0, 0.25, 0.125, -4, 3],
    ]) {
      const expected = new Map([['part', [...coordinates]]])
      const actual = new Map([['part', [...coordinates]]])
      reference.apply({}, expected)
      candidate.apply({}, actual)
      expect(actual).toEqual(expected)
    }
  },
)

test('should retain animated grids and rotations when memory grows between frames', () => {
  const bone: PuppetSceneDeformerNode = {
    ...shape,
    boneRestPoints: [0, 0, 0, 1],
    children: [shape],
    controlPoints: [0, 0, 0, 1],
    deformerType: 'rotation',
    id: 'parent',
  }
  const document: PuppetDocument = {
    ...documentFor({...shape, children: [bone], id: 'outer'}),
    parameterBindings: [
      {
        id: 'move',
        interpolation: 'grid',
        keyforms: [0, 1].map((value) => ({
          deformers: [bone, shape].map((node) => ({
            controlPoints: node.controlPoints.map((rest, index) => rest + value / (index + 3)),
            kind: 'deformer' as const,
            nodeId: node.id,
          })),
          parts: [],
          values: [value],
        })),
        parameterIds: ['p'],
        targetDeformerIds: [bone.id, shape.id],
      },
    ],
  }
  const instance = new WebAssembly.Instance(module)
  const factory = createWasmTransform(document, instance)
  const wasm = createNativeDeformation(document, factory)!
  const native = createNativeDeformation(document)!
  const source = [0.25, 0.5, 0.8, 0.7]
  const first = new Map([['part', new Float32Array(source)]])
  wasm.apply({p: 0}, first)
  const memory = instance.exports.memory
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error('Missing linear memory')
  }
  for (const p of [0.5, 1, 0, 0.75]) {
    memory.grow(1)
    const actual = new Map([['part', new Float32Array(source)]])
    const expected = new Map([['part', new Float32Array(source)]])
    native.apply({p}, expected)
    wasm.apply({p}, actual)
    expect(actual).toEqual(expected)
  }
})

test.each(['bilinear', 'triangles', 'triangles-mirrored'] as const)(
  'should preserve %s coordinates through changing parents, cell crossings and scratch resizing',
  (interpolation) => {
    const parent = {...shape, children: [{...shape, interpolation}], id: 'parent'}
    const document: PuppetDocument = {
      ...documentFor(parent),
      parameterBindings: [
        {
          id: 'parent-move',
          interpolation: 'grid',
          keyforms: [0, 1].map((value) => ({
            deformers: [
              {
                controlPoints: parent.controlPoints.map(
                  (coordinate, index) => coordinate + value / (index + 3),
                ),
                kind: 'deformer' as const,
                nodeId: 'parent',
              },
            ],
            parts: [],
            values: [value],
          })),
          parameterIds: ['p'],
          targetDeformerIds: ['parent'],
        },
      ],
    }
    const reference = createNativeDeformation(document)!
    const candidate = create(document)
    const inputs = [
      [0, 0, 0.25, 0.75, -3, 4, 0.5, 0.5],
      [0, 0],
      [],
      [0.25, 0.75],
      [0.75, 0.25],
      [0.5, 0.5, -0, 0, 2, -2, 1, 1],
    ]
    for (const p of [0, 0.5, 1, 0.5]) {
      for (const source of inputs) {
        const actual = new Map([['part', [...source]]])
        const expected = new Map([['part', [...source]]])
        reference.apply({p}, expected)
        candidate.apply({p}, actual)
        expect(actual).toEqual(expected)
      }
    }
  },
)

test.each([2, 3])(
  'should preserve %i-axis grid samples with missing corners and an independent influence',
  (axes) => {
    const ids = Array.from({length: axes}, (_, index) => `axis-${index}`)
    const parsed = parseDocumentValue({
      ...documentFor(),
      parameterBindings: [
        {
          id: 'grid',
          interpolation: 'grid',
          keyforms: Array.from({length: 2 ** axes - 1}, (_, corner) => ({
            deformers: [
              {
                controlPoints: shape.controlPoints.map(
                  (value, index) => value + corner / (index + 3),
                ),
                kind: 'deformer' as const,
                nodeId: shape.id,
              },
            ],
            parts: [],
            values: ids.map((_, axis) => Math.floor(corner / 2 ** axis) % 2),
          })),
          parameterIds: ids,
          targetDeformerIds: [shape.id],
        },
        {
          id: 'weighted',
          influenceMode: 'multiply',
          influences: [
            {
              parameterId: 'weight',
              points: [
                {value: 0, weight: 0},
                {value: 1, weight: 1},
              ],
            },
          ],
          interpolation: 'grid',
          keyforms: [0, 1].map((value) => ({
            deformers: [
              {
                controlPoints: shape.controlPoints.map((rest, index) => rest - value / (index + 2)),
                kind: 'deformer' as const,
                nodeId: shape.id,
              },
            ],
            parts: [],
            values: [value],
          })),
          parameterIds: [ids[0]!],
          sampling: {continuousPrecision: 'float32'},
          targetDeformerIds: [shape.id],
        },
      ],
      parameters: [...ids, 'weight'].map((id) => ({
        defaultValue: 0.25,
        id,
        maximum: 1,
        minimum: 0,
        name: id,
        repeat: id === ids[0],
      })),
      parts: [
        {
          id: 'part',
          mesh: {
            boundaryLoops: [[0, 1, 2]],
            indices: [0, 1, 2],
            uvs: [0, 0, 1, 0, 0, 1],
            vertices: [0, 0, 1, 0, 0, 1],
          },
          texture: {height: 1, src: 'part.png', width: 1},
        },
      ],
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error('Invalid multi-axis deformation fixture')
    }
    const document = parsed.document
    const reference = createNativeDeformation(document)!
    const candidate = create(document)
    for (const value of [0.25, 0.75, 1, -0.25]) {
      for (const weight of [0, 0.5, 1]) {
        const parameters = {...Object.fromEntries(ids.map((id) => [id, value])), weight}
        const source = [0.25, 0.75, -2, 3, 1, 0, -0, 0]
        const expected = new Map([['part', [...source]]])
        const actual = new Map([['part', [...source]]])
        reference.apply(parameters, expected)
        candidate.apply(parameters, actual)
        expect(actual).toEqual(expected)
      }
    }
  },
)
