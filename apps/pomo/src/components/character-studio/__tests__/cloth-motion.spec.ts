import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {expect, it} from 'vitest'
import {createClothMotion} from '../cloth-motion'

it('should preserve neutral lengths rather than a stretched starting pose', () => {
  const rest = [new Vector3(0, 1, 0), new Vector3(0.2, 1, 0)]
  const initial = [rest[0].clone(), new Vector3(0.5, 1, 0)]
  const cloth = createClothMotion(rest, [true, false], [[0, 1]], {positions: initial})
  for (let frame = 0; frame < 120; frame += 1) {
    cloth.update(1 / 60, initial, [])
  }
  expect(Vector3.Distance(cloth.positions[0], cloth.positions[1])).toBeCloseTo(0.2, 3)
  expect(cloth.positions[1].y).toBeLessThan(0.9)
})

it('should fall under gravity while keeping the pinned edge and fabric lengths', () => {
  const targets = [new Vector3(0, 1, 0), new Vector3(0.2, 1, 0)]
  const cloth = createClothMotion(targets, [true, false], [[0, 1]])
  for (let frame = 0; frame < 120; frame += 1) {
    cloth.update(1 / 60, targets, [])
  }
  expect(cloth.positions[0].equals(targets[0])).toBe(true)
  expect(cloth.positions[1].y).toBeLessThan(0.9)
  expect(Vector3.Distance(cloth.positions[0], cloth.positions[1])).toBeCloseTo(0.2, 3)
})

it('should rest on a thigh capsule under gravity instead of falling through its middle', () => {
  const targets = [new Vector3(0, 0.4, 0)]
  const cloth = createClothMotion(targets, [false], [])
  const capsules = [{end: new Vector3(0.3, 0, 0), radius: 0.1, start: new Vector3(-0.3, 0, 0)}]
  for (let frame = 0; frame < 180; frame += 1) {
    cloth.update(1 / 60, targets, capsules)
  }
  expect(cloth.positions[0].y).toBeCloseTo(0.1, 3)
})
