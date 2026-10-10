/** @vitest-environment node */
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {expect, it} from 'vitest'
import {createClothBinding} from '../cloth-binding'

it('should preserve trim offsets and follow the proxy without simulating trim particles', () => {
  const rest = [Vector3.Zero(), new Vector3(1, 0, 0), new Vector3(0, 0, 1)]
  const trim = [new Vector3(0.2, 0.03, 0.2), new Vector3(0.4, 0.05, 0.2)]
  const binding = createClothBinding(rest, [[0, 1, 2]], trim)
  binding.update(rest)
  binding.positions.forEach((point, index) =>
    expect(Vector3.Distance(point, trim[index])).toBeLessThan(0.000001),
  )
  binding.update(rest.map((point) => point.add(new Vector3(0, -0.2, 0))))
  expect(binding.positions[0].y).toBeCloseTo(-0.17)
  expect(binding.positions[1].y).toBeCloseTo(-0.15)
  binding.update(rest.map((point) => new Vector3(point.x, point.z, -point.y)))
  expect(binding.positions[0].x).toBeCloseTo(0.2)
  expect(binding.positions[0].y).toBeCloseTo(0.2)
  expect(binding.positions[0].z).toBeCloseTo(-0.03)
})

it('should normalize clipped weights while retaining owned position references', () => {
  const rest = [Vector3.Zero(), new Vector3(1, 0, 0), new Vector3(0, 0, 1)]
  const vertex = new Vector3(-1, 0.03, 1)
  const binding = createClothBinding(rest, [[0, 1, 2]], [vertex])
  const positions = binding.positions
  const position = positions[0]

  binding.update([rest[0], rest[1], new Vector3(0, 0, 3)])

  expect(binding.positions).toBe(positions)
  expect(binding.positions[0]).toBe(position)
  expect(position).not.toBe(vertex)
  expect(position.asArray()).toEqual([-1, 0.03, 2])
  expect(vertex.asArray()).toEqual([-1, 0.03, 1])
  expect(rest[2].asArray()).toEqual([0, 0, 1])
})

it.each([
  [0.0001, 0.03],
  [0.0002, -0.17],
])('should preserve the determinant cutoff for a triangle height of %s', (height, expectedY) => {
  const rest = [Vector3.Zero(), new Vector3(1, 0, 0), new Vector3(0, 0, height)]
  const vertex = new Vector3(0.2, 0.03, 0.00005)
  const binding = createClothBinding(rest, [[0, 1, 2]], [vertex])

  binding.update(rest.map((point) => point.add(new Vector3(0, -0.2, 0))))

  expect(binding.positions[0].y).toBeCloseTo(expectedY)
  expect(vertex.y).toBe(0.03)
})
