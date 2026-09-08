import {Vector3} from '@babylonjs/core/Maths/math.vector'
import type {ClothTriangle} from './cloth-constraints'

const EPSILON = 0.00000001

interface ClothBinding {
  triangle: ClothTriangle
  weights: number[]
  offset: Vector3
}

const frame = (first: Vector3, second: Vector3, third: Vector3) => {
  const tangent = second.subtract(first).normalize()
  const normal = Vector3.Cross(tangent, third.subtract(first)).normalize()
  return {bitangent: Vector3.Cross(normal, tangent), normal, tangent}
}

const coordinates = (point: Vector3, first: Vector3, second: Vector3, third: Vector3) => {
  const edge = second.subtract(first)
  const other = third.subtract(first)
  const offset = point.subtract(first)
  const along = edge.lengthSquared()
  const across = Vector3.Dot(edge, other)
  const width = other.lengthSquared()
  const denominator = along * width - across * across
  if (denominator <= EPSILON) {
    return undefined
  }
  const left = Vector3.Dot(offset, edge)
  const right = Vector3.Dot(offset, other)
  const secondWeight = (width * left - across * right) / denominator
  const thirdWeight = (along * right - across * left) / denominator
  const weights = [1 - secondWeight - thirdWeight, secondWeight, thirdWeight].map((weight) =>
    Math.max(0, weight),
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  return weights.map((weight) => weight / total)
}

/** Transfers a simulation surface to detailed garment vertices in the local triangle frame. */
export const createClothBinding = (
  rest: readonly Vector3[],
  triangles: readonly ClothTriangle[],
  vertices: readonly Vector3[],
) => {
  const bindings = vertices.map((point) => {
    let best: ClothBinding | undefined
    let distance = Infinity
    for (const triangle of triangles) {
      const [first, second, third] = triangle.map((index) => rest[index])
      const weights = coordinates(point, first, second, third)
      if (weights !== undefined) {
        const projected = first
          .scale(weights[0])
          .add(second.scale(weights[1]))
          .add(third.scale(weights[2]))
        const residual = point.subtract(projected)
        if (residual.lengthSquared() < distance) {
          const basis = frame(first, second, third)
          distance = residual.lengthSquared()
          best = {
            offset: new Vector3(
              Vector3.Dot(residual, basis.tangent),
              Vector3.Dot(residual, basis.bitangent),
              Vector3.Dot(residual, basis.normal),
            ),
            triangle,
            weights,
          }
        }
      }
    }
    return best
  })
  const positions = vertices.map((point) => point.clone())
  return {
    positions,
    update(points: readonly Vector3[]) {
      bindings.forEach((binding, index) => {
        if (binding !== undefined) {
          const {triangle, weights, offset} = binding
          const [first, second, third] = triangle.map((vertex) => points[vertex])
          const basis = frame(first, second, third)
          positions[index]
            .copyFrom(first)
            .scaleInPlace(weights[0])
            .addInPlace(second.scale(weights[1]))
            .addInPlace(third.scale(weights[2]))
            .addInPlace(basis.tangent.scale(offset.x))
            .addInPlace(basis.bitangent.scale(offset.y))
            .addInPlace(basis.normal.scale(offset.z))
        }
      })
    },
  }
}
