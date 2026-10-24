import {expect, test} from 'vitest'
import {createMeshSmoother} from '../create-mesh-smoother'

const indices = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]
const vertices = [0, 0, 100, 0, 100, 100, 0, 100, 70, 60]

test('should smooth toward unique connected neighbors while preserving the inferred outline', () => {
  const smoother = createMeshSmoother({indices})
  const result = smoother.apply({center: {x: 70, y: 60}, radius: 80, strength: 0.5, vertices})
  expect(smoother.available).toBe(true)
  expect(result).toEqual([0, 0, 100, 0, 100, 100, 0, 100, 60, 55])
  expect(vertices[8]).toBe(70)
})

test('should fall off with distance and leave points outside the radius unchanged', () => {
  const smoother = createMeshSmoother({indices})
  expect(smoother.apply({center: {x: 30, y: 60}, radius: 80, strength: 1, vertices})[8]).toBe(60)
  expect(smoother.apply({center: {x: 0, y: 60}, radius: 40, strength: 1, vertices})).toEqual(
    vertices,
  )
})

test('should preserve explicit inner boundaries and disconnected vertices', () => {
  const smoother = createMeshSmoother({boundaryLoops: [[0, 4, 2]], indices})
  expect(smoother.available).toBe(false)
  const points = [...vertices, 70, 60]
  expect(
    smoother.apply({center: {x: 70, y: 60}, radius: 80, strength: 1, vertices: points}),
  ).toEqual(points)
})

test('should keep separate mesh islands independent', () => {
  const smoother = createMeshSmoother({indices: [...indices, ...indices.map((index) => index + 5)]})
  const points = [...vertices, 200, 0, 300, 0, 300, 100, 200, 100, 270, 60]
  const result = smoother.apply({center: {x: 70, y: 60}, radius: 80, strength: 1, vertices: points})
  expect(result.slice(8, 10)).toEqual([50, 50])
  expect(result.slice(10)).toEqual(points.slice(10))
})

test('should disable smoothing when there are no interior vertices', () => {
  expect(createMeshSmoother({indices: [0, 1, 2]}).available).toBe(false)
  expect(createMeshSmoother({indices: []}).available).toBe(false)
})
