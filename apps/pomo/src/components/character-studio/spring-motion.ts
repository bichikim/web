import {Vector3} from '@babylonjs/core/Maths/math.vector'

export interface SpringCollider {
  readonly center: Vector3
  readonly radius: number
}
interface SpringStep {
  readonly segmentCollision?: boolean
  readonly maxAngle?: number
  readonly seat?: {readonly min: Vector3; readonly max: Vector3}
  readonly origin: Vector3
  readonly current: Vector3
  readonly previous: Vector3
  readonly rest: Vector3
  readonly length: number
  readonly gravity: number
  readonly stiffness: number
  readonly drag: number
  readonly delta: number
  readonly colliders: readonly SpringCollider[]
  readonly radius: number
}
const SOLVER = {epsilon: 0.000001, iterations: 8, minimumWeight: 0.05}

export const advanceSpring = (step: SpringStep) => {
  const next = step.current
    .add(step.current.subtract(step.previous).scale(1 - step.drag))
    .add(
      step.rest
        .subtract(step.origin)
        .normalize()
        .scale(step.stiffness * step.delta),
    )
    .add(new Vector3(0, -step.gravity * step.delta, 0))
  const constrain = () =>
    next.copyFrom(step.origin.add(next.subtract(step.origin).normalize().scale(step.length)))
  constrain()
  const limit = step.maxAngle
  if (limit !== undefined) {
    const rest = step.rest.subtract(step.origin).normalize()
    const direction = next.subtract(step.origin).normalize()
    const dot = Math.min(1, Math.max(-1, Vector3.Dot(rest, direction)))
    if (Math.acos(dot) > limit) {
      const tangent = direction.subtract(rest.scale(dot)).normalize()
      next.copyFrom(
        step.origin.add(
          rest
            .scale(Math.cos(limit))
            .add(tangent.scale(Math.sin(limit)))
            .scale(step.length),
        ),
      )
    }
  }
  for (let iteration = 0; iteration < SOLVER.iterations; iteration += 1) {
    const {seat} = step
    if (
      seat !== undefined &&
      next.x > seat.min.x &&
      next.x < seat.max.x &&
      next.z > seat.min.z &&
      next.z < seat.max.z &&
      next.y > seat.min.y &&
      next.y < seat.max.y + step.radius
    ) {
      const exits = [
        new Vector3(seat.min.x - step.radius, next.y, next.z),
        new Vector3(seat.max.x + step.radius, next.y, next.z),
        new Vector3(next.x, seat.max.y + step.radius, next.z),
        new Vector3(next.x, next.y, seat.min.z - step.radius),
        new Vector3(next.x, next.y, seat.max.z + step.radius),
      ]
      exits.sort(
        (left, right) => Vector3.DistanceSquared(left, next) - Vector3.DistanceSquared(right, next),
      )
      next.copyFrom(exits[0])
      constrain()
    }
    for (const collider of step.colliders) {
      const segment = next.subtract(step.origin)
      const weight = step.segmentCollision
        ? Math.max(
            SOLVER.minimumWeight,
            Math.min(
              1,
              Vector3.Dot(collider.center.subtract(step.origin), segment) /
                Math.max(segment.lengthSquared(), SOLVER.epsilon),
            ),
          )
        : 1
      const contact = step.origin.add(segment.scale(weight))
      const offset = contact.subtract(collider.center)
      const distance = offset.length()
      const radius = collider.radius + step.radius
      if (distance < radius) {
        const direction = distance > SOLVER.epsilon ? offset.scale(1 / distance) : Vector3.Up()
        next.addInPlace(direction.scale((radius - distance) / weight))
        constrain()
      }
    }
  }
  return next
}
