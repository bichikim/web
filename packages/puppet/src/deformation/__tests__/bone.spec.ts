import {expect, test} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../player/document'
import {getBoneWeights, moveBoneJoint, normalizeBonePose, transformBonePoint} from '../bone'

const node: PuppetSceneDeformerNode = {
  boneRestPoints: [0, 0, 50, 0, 100, 0],
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 0, 50, 0, 100, 0],
  id: 'bone',
  kind: 'deformer',
  locked: false,
  name: 'Bone',
  rows: 1,
  visible: true,
}
test('should leave vertices unchanged in the bind pose', () => {
  for (const point of [
    {x: 20, y: 10},
    {x: 70, y: -30},
  ]) {
    const result = transformBonePoint(node, point)
    expect(result.x).toBeCloseTo(point.x)
    expect(result.y).toBeCloseTo(point.y)
  }
})

test('should retain the first manual weight for each part and vertex and observe replacement lists', () => {
  const shape = {
    ...node,
    boneWeights: [
      {partId: 'first', vertexIndex: 0, weights: [0.25, 0.75]},
      {partId: 'first', vertexIndex: 0, weights: [0.9, 0.1]},
      {partId: 'second', vertexIndex: 0, weights: [0.5, 0.5]},
    ],
  }
  const point = {x: 25, y: 5}
  expect(getBoneWeights(shape, point, {partId: 'first', vertexIndex: 0})).toEqual([0.25, 0.75])
  expect(getBoneWeights(shape, point, {partId: 'second', vertexIndex: 0})).toEqual([0.5, 0.5])
  expect(getBoneWeights(shape, point, {partId: 'missing', vertexIndex: 0})).toEqual(
    getBoneWeights(node, point),
  )
  expect(
    getBoneWeights(
      {...shape, boneWeights: [{partId: 'first', vertexIndex: 0, weights: [1, 0]}]},
      point,
      {partId: 'first', vertexIndex: 0},
    ),
  ).toEqual([1, 0])
})

test('should keep degenerate and extreme automatic bone weights on their original numerical path', () => {
  const shape = {...node, boneRestPoints: [0, 0, 50, 0]}
  expect(getBoneWeights(shape, {x: 10, y: 20})).toEqual([1])
  expect(getBoneWeights(shape, {x: 1e300, y: 1e300})[0]).toBeNaN()
  expect(getBoneWeights({...shape, boneRestPoints: [0, 0, 0, 0]}, {x: 0, y: 0})[0]).toBeNaN()
})

test('should apply fractional manual weights and a replacement bone pose without stale transforms', () => {
  const shape = {
    ...node,
    boneRestPoints: [0, 0, 50, 0],
    boneWeights: [{partId: 'part', vertexIndex: 0, weights: [0.5]}],
    controlPoints: [0, 0, 0, 50],
  }
  const vertex = {partId: 'part', vertexIndex: 0}
  const point = {x: 20, y: 10}
  expect(transformBonePoint(shape, point, vertex)).toEqual({x: 5, y: 15})
  const result = transformBonePoint({...shape, controlPoints: [10, 0, 60, 0]}, point, vertex)
  expect(result.x).toBeCloseTo(25)
  expect(result.y).toBeCloseTo(10)
})
test('should rotate the downstream chain without changing bone lengths', () => {
  const controlPoints = moveBoneJoint({index: 1, node, point: {x: 0, y: 80}})
  expect(controlPoints[2]).toBeCloseTo(0)
  expect(controlPoints[3]).toBeCloseTo(50)
  expect(controlPoints[4]).toBeCloseTo(0)
  expect(controlPoints[5]).toBeCloseTo(100)
  const point = transformBonePoint({...node, controlPoints}, {x: 25, y: 10})
  expect(point.x).toBeCloseTo(-10)
  expect(point.y).toBeCloseTo(25)
})
test('should keep interpolated poses at bind lengths and remain finite when a direction collapses', () => {
  const result = normalizeBonePose(node.boneRestPoints!, [0, 0, 25, 25, 50, 50])
  expect(Math.hypot(result[2]!, result[3]!)).toBeCloseTo(50)
  expect(Math.hypot(result[4]! - result[2]!, result[5]! - result[3]!)).toBeCloseTo(50)
  expect(normalizeBonePose(node.boneRestPoints!, [0, 0, 0, 0, 0, 0]).every(Number.isFinite)).toBe(
    true,
  )
})
