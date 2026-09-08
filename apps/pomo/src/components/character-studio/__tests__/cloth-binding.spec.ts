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
