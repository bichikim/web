import {expect, test} from 'vitest'

import type {PuppetSceneDeformerNode} from '../../player/document'
import {transformDeformerPoint, untransformDeformerPoint} from '../grid'

const node: PuppetSceneDeformerNode = {
  bounds: {height: 20, width: 90, x: 0, y: 0},
  children: [],
  columns: 1,
  controlPoints: [0, 10, 30, 10, 60, 10, 90, 10],
  curveAxis: 'x',
  id: 'curve',
  kind: 'deformer',
  locked: false,
  name: 'Curve',
  rows: 1,
  visible: true,
}

test('should preserve a straight curve and points beyond its endpoints', () => {
  for (const point of [
    {x: 45, y: 5},
    {x: -20, y: 20},
    {x: 120, y: 0},
  ]) {
    const result = transformDeformerPoint(node, point)
    expect(result.x).toBeCloseTo(point.x)
    expect(result.y).toBeCloseTo(point.y)
  }
})

test('should bend the centerline while preserving perpendicular width', () => {
  const curved = {...node, controlPoints: [0, 10, 30, 50, 60, 50, 90, 10]}
  const center = transformDeformerPoint(curved, {x: 45, y: 10})
  const edge = transformDeformerPoint(curved, {x: 45, y: 20})
  expect(center).toEqual({x: 45, y: 40})
  expect(Math.hypot(edge.x - center.x, edge.y - center.y)).toBeCloseTo(10)
  const restored = untransformDeformerPoint(curved, edge)
  expect(restored.x).toBeCloseTo(45)
  expect(restored.y).toBeCloseTo(20)
})

test('should support vertical curves and collapsed tangent handles', () => {
  const vertical: PuppetSceneDeformerNode = {
    ...node,
    controlPoints: [45, 0, 45, 20 / 3, 45, 40 / 3, 45, 20],
    curveAxis: 'y',
  }
  expect(transformDeformerPoint(vertical, {x: 10, y: 8}).x).toBeCloseTo(10)
  expect(transformDeformerPoint(vertical, {x: 10, y: 8}).y).toBeCloseTo(8)
  const collapsed = {...node, controlPoints: [0, 10, 0, 10, 90, 10, 90, 10]}
  expect(transformDeformerPoint(collapsed, {x: 0, y: 20})).toEqual({x: 0, y: 20})
})
