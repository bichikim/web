import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {expect, it} from 'vitest'
import {createClothConstraints} from '../cloth-constraints'

it('should resist folding across a shared triangle edge without moving pinned vertices', () => {
  const rest = [
    new Vector3(-1, 0, 0),
    new Vector3(1, 0, 0),
    new Vector3(0, 0, 1),
    new Vector3(0, 0, -1),
  ]
  const points = rest.map((point) => point.clone())
  const constraints = createClothConstraints(
    rest,
    [true, true, true, false],
    [],
    [
      [0, 1, 2],
      [1, 0, 3],
    ],
  )
  points[3].set(0, 0.8, -0.6)
  const before = Vector3.Distance(points[2], points[3])
  constraints.reset()
  for (let iteration = 0; iteration < 12; iteration += 1) {
    constraints.solve(points, 1 / 120)
  }
  expect(Vector3.Distance(points[2], points[3])).toBeGreaterThan(before)
  expect(points[0].equals(rest[0])).toBe(true)
  expect(points[2].equals(rest[2])).toBe(true)
})
