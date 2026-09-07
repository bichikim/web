import {expect, test} from 'vitest'
import type {PuppetSceneDeformerNode} from '../../player/document'
import {moveBoneJoint, normalizeBonePose, transformBonePoint} from '../bone'

const node: PuppetSceneDeformerNode = {
  bounds: {height: 100, width: 100, x: 0, y: 0},
  children: [],
  columns: 1,
  id: 'bone',
  boneRestPoints: [0, 0, 50, 0, 100, 0],
  kind: 'deformer',
  controlPoints: [0, 0, 50, 0, 100, 0],
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
