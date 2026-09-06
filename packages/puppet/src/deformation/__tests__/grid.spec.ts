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

test('should invert a manually weighted vertex using its part and vertex identity', () => {
  const bone: PuppetSceneDeformerNode = {
    id: 'bone',
    kind: 'deformer',
    name: 'Bone',
    locked: false,
    bounds: {x: 0, y: 0, width: 100, height: 100},
    visible: true,
    columns: 1,
    children: [],
    rows: 1,
    boneRestPoints: [0, 0, 50, 0, 100, 0],
    boneWeights: [{partId: 'a', vertexIndex: 0, weights: [1, 0]}],
    controlPoints: [0, 0, 50, 0, 50, 50],
  }
  const reference = {partId: 'a', vertexIndex: 0}
  const point = {x: 75, y: 10}
  const restored = untransformDeformerPoint(
    bone,
    transformDeformerPoint(bone, point, reference),
    reference,
  )
  expect(restored.x).toBeCloseTo(point.x)
  expect(restored.y).toBeCloseTo(point.y)
})

test('should expose the preserved binding coordinates used for current bone influence', async () => {
  const {getDeformerInputPoint} = await import('../grid')
  const {rebindDeformer} = await import('../binding')
  const bone: PuppetSceneDeformerNode = {
    id: 'bone',
    kind: 'deformer',
    name: 'Bone',
    locked: false,
    bounds: {x: 0, y: 0, width: 100, height: 100},
    visible: true,
    columns: 1,
    children: [],
    rows: 1,
    boneRestPoints: [0, 0, 50, 0],
    controlPoints: [0, 0, 0, 50],
  }
  const rebound = rebindDeformer(bone, {
    ...bone,
    boneRestPoints: [0, 10, 50, 10],
    controlPoints: [0, 10, 50, 10],
  })
  const point = getDeformerInputPoint(rebound, {x: 25, y: 10})
  expect(point.x).toBeCloseTo(-10)
  expect(point.y).toBeCloseTo(25)
})

test('should blend grid, curve and pin deformation per vertex and invert the blended result', () => {
  const shapes = [
    {...node, controlPoints: [10, 0, 100, 0, 10, 20, 100, 20], curveAxis: undefined},
    {...node, controlPoints: [0, 20, 30, 20, 60, 20, 90, 20]},
    {
      ...node,
      curveAxis: undefined,
      controlPoints: [55, 20],
      pins: [{x: 45, y: 10, radius: 100, strength: 1}],
    },
  ]
  const point = {x: 45, y: 10}
  const vertex = {partId: 'mesh', vertexIndex: 0}
  for (const shape of shapes) {
    const full = transformDeformerPoint(shape, point)
    expect(full).not.toEqual(point)
    for (const weight of [0, 0.25, 1]) {
      const weighted = {...shape, vertexInfluences: [{...vertex, weight}]}
      const result = transformDeformerPoint(weighted, point, vertex)
      expect(result.x).toBeCloseTo(point.x + (full.x - point.x) * weight)
      expect(result.y).toBeCloseTo(point.y + (full.y - point.y) * weight)
      const inverse = untransformDeformerPoint(weighted, result, vertex)
      expect(inverse.x).toBeCloseTo(point.x)
      expect(inverse.y).toBeCloseTo(point.y)
      expect(transformDeformerPoint(weighted, point, {...vertex, vertexIndex: 1})).toEqual(full)
    }
  }
})

test('should mask the entire deformation after changing the rest layout', async () => {
  const {rebindDeformer} = await import('../binding')
  const before = {...node, controlPoints: [0, 20, 30, 20, 60, 20, 90, 20]}
  const rebound = rebindDeformer(before, {
    ...before,
    controlPoints: [0, 30, 30, 30, 60, 30, 90, 30],
  })
  const point = {x: 45, y: 10}
  const vertex = {partId: 'part', vertexIndex: 0}
  expect(
    transformDeformerPoint({...rebound, vertexInfluences: [{...vertex, weight: 0}]}, point, vertex),
  ).toEqual(point)
})
