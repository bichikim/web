import {Vector3} from '@babylonjs/core/Maths/math.vector'

export type ClothTriangle = readonly [number, number, number]
export type ClothEdge = readonly [number, number]

interface DistanceConstraint {
  readonly first: number
  readonly second: number
  readonly length: number
  readonly compliance: number
  lambda: number
}

export interface ClothConstraints {
  reset(): void
  solve(points: readonly Vector3[], delta: number): void
}

/** Builds stretch and opposite-vertex bending constraints from the fabric topology. */
export const createClothConstraints = (
  rest: readonly Vector3[],
  pinned: readonly boolean[],
  edges: readonly ClothEdge[],
  triangles: readonly ClothTriangle[],
): ClothConstraints => {
  const settings = {bending: 0.0001, epsilon: 0.000001}
  const constraints: DistanceConstraint[] = []
  const visited = new Set<string>()
  const add = (first: number, second: number, compliance: number) => {
    const key = first < second ? `${first}:${second}` : `${second}:${first}`
    if (first !== second && !visited.has(key)) {
      visited.add(key)
      constraints.push({
        compliance,
        first,
        lambda: 0,
        length: Vector3.Distance(rest[first], rest[second]),
        second,
      })
    }
  }
  edges.forEach(([first, second]) => add(first, second, 0))
  const opposite = new Map<string, number>()
  for (const [first, second, third] of triangles) {
    for (const [left, right, tip] of [
      [first, second, third],
      [second, third, first],
      [third, first, second],
    ]) {
      const key = left < right ? `${left}:${right}` : `${right}:${left}`
      const neighbor = opposite.get(key)
      if (neighbor === undefined) {
        opposite.set(key, tip)
      } else {
        add(neighbor, tip, settings.bending)
      }
    }
  }
  const direction = Vector3.Zero()
  return {
    reset() {
      constraints.forEach((constraint) => {
        constraint.lambda = 0
      })
    },
    solve(points, delta) {
      for (const constraint of constraints) {
        const first = points[constraint.first]
        const second = points[constraint.second]
        second.subtractToRef(first, direction)
        const length = direction.length()
        const left = pinned[constraint.first] ? 0 : 1
        const right = pinned[constraint.second] ? 0 : 1
        const alpha = constraint.compliance / (delta * delta)
        if (length > settings.epsilon && left + right > 0) {
          const correction =
            (length - constraint.length - alpha * constraint.lambda) / (left + right + alpha)
          constraint.lambda += correction
          direction.scaleInPlace(correction / length)
          first.addInPlaceFromFloats(direction.x * left, direction.y * left, direction.z * left)
          second.subtractInPlace(direction.scaleInPlace(right))
        }
      }
    },
  }
}
