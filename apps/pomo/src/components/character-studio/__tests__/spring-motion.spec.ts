import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {expect, it} from 'vitest'
import {advanceSpring} from '../spring-motion'

it('should resolve a collider intersecting the middle of a cloth bone', () => {
  const tail = new Vector3(1, 0, 0)
  const center = new Vector3(0.5, -0.05, 0)
  const result = advanceSpring({
    colliders: [{center, radius: 0.15}],
    current: tail,
    delta: 1 / 60,
    drag: 1,
    gravity: 0,
    length: 1,
    maxAngle: 0.1,
    origin: Vector3.Zero(),
    previous: tail,
    radius: 0.01,
    rest: tail,
    segmentCollision: true,
    stiffness: 0,
  })
  const closest = result.scale(Math.max(0, Math.min(1, Vector3.Dot(center, result))))
  expect(Vector3.Distance(closest, center)).toBeGreaterThanOrEqual(0.159)
  expect(result.length()).toBeCloseTo(1)
})

it('should limit skirt deflection even under a strong gravity impulse', () => {
  const rest = new Vector3(1, 0, 0)
  const result = advanceSpring({
    colliders: [],
    current: rest,
    delta: 1,
    drag: 1,
    gravity: 10,
    length: 1,
    maxAngle: 0.22,
    origin: Vector3.Zero(),
    previous: rest,
    radius: 0.01,
    rest,
    stiffness: 0,
  })
  expect(Math.acos(result.x)).toBeCloseTo(0.22)
  expect(result.length()).toBeCloseTo(1)
})

it('should release a hem through the nearby seat edge instead of lifting it', () => {
  const tail = new Vector3(0.99, 0.2, 0)
  const origin = new Vector3(1.1, 0.8, 0)
  const result = advanceSpring({
    colliders: [],
    current: tail,
    delta: 1 / 60,
    drag: 1,
    gravity: 0,
    length: Vector3.Distance(origin, tail),
    origin,
    previous: tail,
    radius: 0.01,
    rest: tail,
    seat: {max: new Vector3(1, 0.6, 1), min: new Vector3(-1, 0, -1)},
    stiffness: 0,
  })
  expect(result.y).toBeLessThan(0.3)
  expect(result.x).toBeGreaterThan(1)
})

it('should keep a falling tip above the seat cushion', () => {
  const tail = new Vector3(0.6, 0.2, 0)
  const result = advanceSpring({
    colliders: [],
    current: tail,
    delta: 1 / 60,
    drag: 0.2,
    gravity: 0,
    length: 1,
    origin: new Vector3(0, 1, 0),
    previous: tail,
    radius: 0.01,
    rest: tail,
    seat: {max: new Vector3(2, 0.5, 2), min: new Vector3(-2, 0, -2)},
    stiffness: 0,
  })
  expect(result.y).toBeGreaterThan(0.49)
})

it('should fall under gravity while preserving the bone length', () => {
  const origin = Vector3.Zero()
  const tail = new Vector3(1, 0, 0)
  const result = advanceSpring({
    colliders: [],
    current: tail,
    delta: 1 / 60,
    drag: 0.2,
    gravity: 1,
    length: 1,
    origin,
    previous: tail,
    radius: 0.01,
    rest: tail,
    stiffness: 0,
  })
  expect(result.y).toBeLessThan(0)
  expect(result.length()).toBeCloseTo(1)
})

it('should push the tip outside a body collider', () => {
  const tail = new Vector3(0, -1, 0)
  const result = advanceSpring({
    colliders: [{center: new Vector3(0.1, -1, 0), radius: 0.2}],
    current: tail,
    delta: 1 / 60,
    drag: 0.2,
    gravity: 0,
    length: 1,
    origin: Vector3.Zero(),
    previous: tail,
    radius: 0.01,
    rest: tail,
    stiffness: 0,
  })
  expect(Vector3.Distance(result, new Vector3(0.1, -1, 0))).toBeGreaterThanOrEqual(0.209)
})
