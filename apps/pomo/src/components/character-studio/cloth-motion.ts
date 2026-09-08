import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {type ClothTriangle, createClothConstraints} from './cloth-constraints'
import {createClothCollisions} from './cloth-collisions'

const SETTINGS = {
  damping: 0.985,
  epsilon: 0.000001,
  frequency: 60,
  gravity: 9.81,
  iterations: 4,
  maxCorrection: 0.1,
  maxTravel: 0.004,
  minimumFps: 30,
  seatDepth: 1.1,
  seatHeight: 0.6,
  seatLeft: 1.5,
  seatRight: 0.62,
  seatSurface: 0.612,
}

export interface ClothCapsule {
  readonly start: Vector3
  readonly end: Vector3
  readonly radius: number
}

export interface ClothMotion {
  readonly positions: Vector3[]
  update(
    delta: number,
    targets: readonly Vector3[],
    capsules: readonly ClothCapsule[],
    seatHeight?: number,
  ): void
}

interface ClothInitialState {
  readonly triangles?: readonly ClothTriangle[]
  readonly positions?: readonly Vector3[]
}

/** Integrates a connected fabric surface with animated pins and capsule contact. */
export const createClothMotion = (
  rest: readonly Vector3[],
  pinned: readonly boolean[],
  edges: readonly (readonly [number, number])[],
  state: ClothInitialState = {},
): ClothMotion => {
  const triangles = state.triangles ?? []
  const initial = state.positions ?? rest
  const positions = initial.map((point) => point.clone())
  const previous = initial.map((point) => point.clone())
  const accepted = initial.map((point) => point.clone())
  const constraints = createClothConstraints(rest, pinned, edges, triangles)
  const collisions = createClothCollisions(rest, pinned, triangles)
  const direction = Vector3.Zero()
  const nearest = Vector3.Zero()
  const offset = Vector3.Zero()
  const resolveContact = (point: Vector3, capsules: readonly ClothCapsule[]) => {
    for (const capsule of capsules) {
      capsule.end.subtractToRef(capsule.start, direction)
      point.subtractToRef(capsule.start, offset)
      const amount = Math.max(
        0,
        Math.min(
          1,
          Vector3.Dot(offset, direction) / Math.max(direction.lengthSquared(), SETTINGS.epsilon),
        ),
      )
      nearest.copyFrom(capsule.start).addInPlace(direction.scaleInPlace(amount))
      point.subtractToRef(nearest, offset)
      const distance = offset.length()
      if (distance < capsule.radius) {
        if (distance < SETTINGS.epsilon) {
          offset.copyFromFloats(0, 1, 0)
        } else {
          offset.scaleInPlace(1 / distance)
        }
        point.copyFrom(nearest).addInPlace(offset.scaleInPlace(capsule.radius))
      }
    }
  }
  let accumulated = 0
  const step = 1 / SETTINGS.frequency
  return {
    positions,
    update(delta, targets, capsules, seatHeight) {
      positions.forEach((point, index) => {
        if (
          !Number.isFinite(point.lengthSquared()) ||
          Vector3.Distance(point, accepted[index]) > SETTINGS.maxCorrection
        ) {
          point.copyFrom(accepted[index])
          previous[index].copyFrom(point)
        }
      })
      accumulated += Math.min(Math.max(delta, 0), 1 / SETTINGS.minimumFps)
      while (accumulated >= step) {
        accumulated -= step
        for (const [index, point] of positions.entries()) {
          if (pinned[index]) {
            point.copyFrom(targets[index])
            previous[index].copyFrom(point)
          } else {
            point.subtractToRef(previous[index], direction)
            previous[index].copyFrom(point)
            direction.scaleInPlace(SETTINGS.damping)
            direction.y -= SETTINGS.gravity * step * step
            const travel = direction.length()
            if (travel > SETTINGS.maxTravel) {
              direction.scaleInPlace(SETTINGS.maxTravel / travel)
            }
            point.addInPlace(direction)
          }
        }
        constraints.reset()
        for (let iteration = 0; iteration < SETTINGS.iterations; iteration += 1) {
          constraints.solve(positions, step)
          positions.forEach((point, index) => {
            if (!pinned[index]) {
              resolveContact(point, capsules)
              if (
                seatHeight !== undefined &&
                point.x > -SETTINGS.seatLeft &&
                point.x < -SETTINGS.seatRight &&
                Math.abs(point.z) < SETTINGS.seatDepth &&
                point.y < seatHeight &&
                previous[index].y >= seatHeight - SETTINGS.epsilon
              ) {
                point.y = seatHeight
              }
            }
          })
        }
        collisions.solve(positions, previous)
        positions.forEach((point, index) => {
          if (!pinned[index]) {
            resolveContact(point, capsules)
          }
        })
        positions.forEach((point, index) => {
          if (Number.isFinite(point.lengthSquared()) === false) {
            point.copyFrom(accepted[index])
            previous[index].copyFrom(point)
          } else {
            const correction = Vector3.Distance(point, accepted[index])
            if (!pinned[index] && correction > SETTINGS.maxCorrection) {
              Vector3.LerpToRef(accepted[index], point, SETTINGS.maxCorrection / correction, point)
              previous[index].copyFrom(point)
            }
            accepted[index].copyFrom(point)
          }
        })
      }
    },
  }
}
