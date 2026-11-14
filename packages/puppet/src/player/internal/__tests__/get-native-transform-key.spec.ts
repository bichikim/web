import {expect, test} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import type {PuppetSceneDeformerNode} from '../../document'
import {getNativeTransformKey} from '../get-native-transform-key'
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
  const document = {...createEmptyDocument(), parameterBindings: [binding('a'), binding('b')]}
  expect(getNativeTransformKey(document, shape)).toBe(
    getNativeTransformKey(document, {...shape, id: 'b', name: 'B', visible: false}),
  )
})
test('should distinguish different parameter inputs, arithmetic signs and sampling policies', () => {
  const document = {
    ...createEmptyDocument(),
    parameterBindings: [binding('a'), binding('b', 'other')],
  }
  expect(getNativeTransformKey(document, shape)).not.toBe(
    getNativeTransformKey(document, {...shape, id: 'b'}),
  )
  expect(getNativeTransformKey(document, shape)).not.toBe(
    getNativeTransformKey(document, {
      ...shape,
      controlPoints: [-0, ...shape.controlPoints.slice(1)],
    }),
  )
  expect(getNativeTransformKey(document, shape)).not.toBe(
    getNativeTransformKey(
      {
        ...document,
        parameterBindings: [{...binding('a'), sampling: {continuousPrecision: 'float32'}}],
      },
      shape,
    ),
  )
})
