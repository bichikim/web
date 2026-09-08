import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {expect, it} from 'vitest'
import {createClothCollisions} from '../cloth-collisions'

it('should finish for oversized and nonfinite collision bounds', () => {
  const rest = [Vector3.Zero(), new Vector3(0.1, 0, 0), new Vector3(0, 0.1, 0)]
  const points = rest.map((point) => point.clone())
  const collisions = createClothCollisions(rest, [false, false, false], [[0, 1, 2]])
  points[2].set(10, 10, 10)
  collisions.solve(points, rest)
  points[2].set(Infinity, 0, 0)
  collisions.solve(points, rest)
  expect(points[0].asArray().every(Number.isFinite)).toBe(true)
})

it('should stop a vertex crossing a nonadjacent cloth face and preserve pinned fabric', () => {
  const rest = [
    new Vector3(-0.1, 0, -0.1),
    new Vector3(0.1, 0, -0.1),
    new Vector3(0, 0, 0.1),
    new Vector3(0, 0.02, 0),
  ]
  const points = rest.map((point) => point.clone())
  const collisions = createClothCollisions(rest, [true, true, true, false], [[0, 1, 2]])
  points[3].y = -0.01
  collisions.solve(points, rest)
  expect(points[3].y).toBeGreaterThanOrEqual(0.0039)
  expect(points[0].equals(rest[0])).toBe(true)
})

it('should separate resting cloth layers even when their vertices are not aligned', () => {
  const rest = [
    new Vector3(-0.1, 0, -0.1),
    new Vector3(0.1, 0, -0.1),
    new Vector3(0, 0, 0.1),
    new Vector3(0.02, 0.02, 0),
  ]
  const points = rest.map((point) => point.clone())
  points[3].y = 0.001
  createClothCollisions(rest, [true, true, true, false], [[0, 1, 2]]).solve(points, rest)
  expect(points[3].y).toBeCloseTo(0.004, 4)
})
