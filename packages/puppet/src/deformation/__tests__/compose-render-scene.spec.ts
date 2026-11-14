import {expect, test, vi} from 'vitest'
import {
  PUPPET_DOCUMENT_FORMAT,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
} from '../../player/document'
import {composeRenderScene} from '../compose-render-scene'
import {composeParameterScene} from '../scene'
import {applySceneNodeDeformers} from '../vertices'

const node: PuppetSceneDeformerNode = {
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [{id: 'part', kind: 'part', locked: false, name: 'Part', visible: true}],
  columns: 1,
  controlPoints: [0, 0, 1, 0, 0, 1, 1, 1],
  coordinateSpace: 'parent',
  id: 'warp',
  interpolation: 'triangles',
  kind: 'deformer',
  locked: false,
  name: 'Warp',
  rows: 1,
  visible: true,
}

const createDocument = (warp = node): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [
    {
      id: 'grid',
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
            controlPoints: warp.controlPoints.map((coordinate) => coordinate + value),
            kind: 'deformer',
            nodeId: warp.id,
          },
        ],
        parts: [],
        values: [value],
      })),
      parameterIds: ['p'],
      targetDeformerIds: [warp.id],
    },
  ],
  parameters: [
    {defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'Position'},
    {defaultValue: 1, id: 'weight', maximum: 1, minimum: 0, name: 'Weight'},
  ],
  parts: [],
  scene: {roots: [warp]},
  version: 1,
  viewport: {height: 1, width: 1},
})

test('should preserve deformation inside and outside the grid across parameter and influence changes', () => {
  const document = createDocument()
  for (const p of [0, 0.25, 0.75, 1, 0]) {
    for (const weight of [1, 0.5, 0]) {
      const expected = new Map([['part', [0.25, 0.75, -1, 2, 0, 0, 1, 1]]])
      const actual = new Map([['part', [0.25, 0.75, -1, 2, 0, 0, 1, 1]]])
      applySceneNodeDeformers(composeParameterScene(document, {p, weight}).roots, expected)
      applySceneNodeDeformers(composeRenderScene(document, {p, weight}).roots, actual, {
        deferCoordinates: true,
      })
      expect(actual).toEqual(expected)
    }
  }
  expect(node.controlPoints).toEqual([0, 0, 1, 0, 0, 1, 1, 1])
})

test('should retain frame inputs until deferred coordinates are read and invalidate a replaced document', () => {
  const document = createDocument()
  const values = {p: 0.25, weight: 0.5}
  const before = composeRenderScene(document, values).roots[0] as PuppetSceneDeformerNode
  values.p = 1
  values.weight = 1
  const after = composeRenderScene(document, values).roots[0] as PuppetSceneDeformerNode
  expect(Array.from(before.controlPoints)).toEqual(node.controlPoints.map((value) => value + 0.125))
  expect(Array.from(after.controlPoints)).toEqual(node.controlPoints.map((value) => value + 1))
  const replacement = {...document, parameterBindings: []}
  const restored = composeRenderScene(replacement, values).roots[0] as PuppetSceneDeformerNode
  expect(Array.from(restored.controlPoints)).toEqual(node.controlPoints)
  expect(() => structuredClone(composeParameterScene(document, values))).not.toThrow()
})

test('should leave unused dense grid points unread until requested', () => {
  const columns = 12
  const points = Array.from({length: (columns + 1) ** 2 * 2}, (_, index) =>
    index % 2 === 0
      ? (Math.floor(index / 2) % (columns + 1)) / columns
      : Math.floor(index / 2 / (columns + 1)) / columns,
  )
  const warp = {...node, columns, controlPoints: points, rows: columns}
  const document = createDocument(warp)
  const keyed = document.parameterBindings![0]!.keyforms[1]!.deformers![0]!.controlPoints
  const read = vi.fn(() => 5)
  Object.defineProperty(keyed, '200', {get: read})
  const frame = composeRenderScene(document, {p: 0.5})
  const vertices = new Map([['part', [0.01, 0.01]]])
  applySceneNodeDeformers(frame.roots, vertices, {deferCoordinates: true})
  expect(read).not.toHaveBeenCalled()
  expect((frame.roots[0] as PuppetSceneDeformerNode).controlPoints[200]).toBe(
    (points[200]! + 5) / 2,
  )
  expect(read).toHaveBeenCalledOnce()
})

test('should retain the eager path for non-grid bindings and non-warp deformers', () => {
  const document = createDocument({...node, interpolation: 'bilinear'})
  const legacy = {
    ...document,
    parameterBindings: document.parameterBindings!.map((binding) => ({
      ...binding,
      interpolation: undefined,
    })),
  }
  const before = composeParameterScene(legacy, {p: 0.5})
  expect(composeRenderScene(legacy, {p: 0.5})).toEqual(before)
  const rotation = {
    ...node,
    boneRestPoints: [0, 0, 1, 0],
    controlPoints: [0, 0, 1, 0],
    deformerType: 'rotation' as const,
  }
  const bone = createDocument(rotation)
  expect(composeRenderScene(bone, {p: 0.5})).toEqual(composeParameterScene(bone, {p: 0.5}))
})
