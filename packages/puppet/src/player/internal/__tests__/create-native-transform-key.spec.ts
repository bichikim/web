import {expect, test} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../document'
import {createNativeTransformKey} from '../create-native-transform-key'
const shape: PuppetSceneDeformerNode = {
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 1, 0, 0, 1, 1, 1],
  coordinateSpace: 'parent',
  id: 'a',
  interpolation: 'bilinear',
  kind: 'deformer',
  locked: false,
  name: 'A',
  rows: 1,
  visible: true,
}
const binding = (id: string, parameterId = 'p') => ({
  id,
  keyforms: [0, 1].map((value) => ({
    deformers: [
      {
        controlPoints: shape.controlPoints.map((x) => x + value),
        kind: 'deformer' as const,
        nodeId: id,
      },
    ],
    parts: [],
    values: [value] as const,
  })),
  parameterIds: [parameterId] as const,
  targetDeformerIds: [id],
})
test('should share coordinate work across names and IDs when geometry and curves match', () => {
  const key = createNativeTransformKey([binding('a'), binding('b')])
  expect(key(shape)).toBe(key({...shape, id: 'b', name: 'B', visible: false}))
})
test('should distinguish grids evaluated before and after their parent transform', () => {
  const key = createNativeTransformKey([])
  expect(key(shape)).not.toBe(key({...shape, coordinateSpace: undefined}))
})
test('should use the first coordinate sample for a target and ignore display properties', () => {
  const first = binding('a')
  const second = binding('b')
  const key = createNativeTransformKey([
    first,
    {
      ...second,
      keyforms: second.keyforms.map((form) => ({
        ...form,
        deformers: [
          {...form.deformers[0]!, properties: {opacity: 0}},
          {...form.deformers[0]!, controlPoints: [9, 9]},
        ],
      })),
    },
  ])
  expect(key(shape)).toBe(key({...shape, id: 'b'}))
})
test('should distinguish which keyform has a coordinate sample', () => {
  const key = createNativeTransformKey(
    ['a', 'b'].map((id, index) => {
      const target = binding(id)
      return {
        ...target,
        keyforms: target.keyforms.map((form, keyform) => ({
          ...form,
          deformers: keyform === index ? [target.keyforms[0]!.deformers[0]!] : [],
        })),
      }
    }),
  )
  expect(key(shape)).not.toBe(key({...shape, id: 'b'}))
})
test('should distinguish different parameter inputs, arithmetic signs and sampling policies', () => {
  const key = createNativeTransformKey([
    binding('a'),
    binding('b', 'other'),
    {...binding('c'), sampling: {continuousPrecision: 'float32'}},
  ])
  expect(key(shape)).not.toBe(key({...shape, id: 'b'}))
  expect(key(shape)).not.toBe(key({...shape, controlPoints: [-0, ...shape.controlPoints.slice(1)]}))
  expect(key(shape)).not.toBe(key({...shape, id: 'c'}))
})
