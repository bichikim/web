import {Vector3} from '@babylonjs/core/Maths/math.vector'
import type {ClothTriangle} from './cloth-constraints'

export interface ClothCollisions {
  solve(points: readonly Vector3[], previous: readonly Vector3[]): void
}

const settings = {
  cell: 0.03,
  corners: 3,
  epsilon: 0.00000001,
  maxCells: 512,
  maxCorrection: 0.02,
  thickness: 0.004,
}

const cells = (minimum: Vector3, maximum: Vector3, visit: (key: string) => void) => {
  const count =
    (Math.floor(maximum.x / settings.cell) - Math.floor(minimum.x / settings.cell) + 1) *
    (Math.floor(maximum.y / settings.cell) - Math.floor(minimum.y / settings.cell) + 1) *
    (Math.floor(maximum.z / settings.cell) - Math.floor(minimum.z / settings.cell) + 1)
  if (!Number.isFinite(count) || count > settings.maxCells || count <= 0) {
    return false
  }
  for (
    let x = Math.floor(minimum.x / settings.cell);
    x <= Math.floor(maximum.x / settings.cell);
    x += 1
  ) {
    for (
      let y = Math.floor(minimum.y / settings.cell);
      y <= Math.floor(maximum.y / settings.cell);
      y += 1
    ) {
      for (
        let z = Math.floor(minimum.z / settings.cell);
        z <= Math.floor(maximum.z / settings.cell);
        z += 1
      ) {
        visit(`${x}:${y}:${z}`)
      }
    }
  }
  return true
}

const barycentric = (edge: Vector3, other: Vector3, offset: Vector3, weights: Float64Array) => {
  const along = Vector3.Dot(edge, edge)
  const across = Vector3.Dot(edge, other)
  const width = Vector3.Dot(other, other)
  const left = Vector3.Dot(offset, edge)
  const right = Vector3.Dot(offset, other)
  const denominator = along * width - across * across
  if (!Number.isFinite(denominator) || denominator <= settings.epsilon * settings.epsilon) {
    return false
  }
  weights[1] = (width * left - across * right) / denominator
  weights[2] = (along * right - across * left) / denominator
  weights[0] = 1 - weights[1] - weights[2]
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 1)) {
    return false
  }
  return true
}

/** Separates nonadjacent fabric vertices and faces using swept broad-phase bounds. */
export const createClothCollisions = (
  rest: readonly Vector3[],
  pinned: readonly boolean[],
  triangles: readonly ClothTriangle[],
): ClothCollisions => {
  const adjacent = rest.map((_, index) => new Set([index]))
  triangles.forEach((triangle) =>
    triangle.forEach((vertex) => triangle.forEach((neighbor) => adjacent[vertex].add(neighbor))),
  )
  const grid = new Map<string, number[]>()
  const candidates = new Set<number>()
  const oversized: number[] = []
  const bounds = triangles.map(() => ({maximum: Vector3.Zero(), minimum: Vector3.Zero()}))
  const edge = Vector3.Zero()
  const other = Vector3.Zero()
  const normal = Vector3.Zero()
  const offset = Vector3.Zero()
  const weights = new Float64Array(settings.corners)
  const project = (
    vertex: number,
    candidate: number,
    points: readonly Vector3[],
    previous: readonly Vector3[],
  ) => {
    const triangle = triangles[candidate]
    const {minimum, maximum} = bounds[candidate]
    const point = points[vertex]
    const priorPoint = previous[vertex]
    if (
      Math.max(point.x, priorPoint.x) < minimum.x ||
      Math.min(point.x, priorPoint.x) > maximum.x ||
      Math.max(point.y, priorPoint.y) < minimum.y ||
      Math.min(point.y, priorPoint.y) > maximum.y ||
      Math.max(point.z, priorPoint.z) < minimum.z ||
      Math.min(point.z, priorPoint.z) > maximum.z
    ) {
      return
    }
    if (triangle.some((neighbor) => adjacent[vertex].has(neighbor))) {
      return
    }
    const [first, second, third] = triangle
    points[second].subtractToRef(points[first], edge)
    points[third].subtractToRef(points[first], other)
    Vector3.CrossToRef(edge, other, normal)
    const area = normal.length()
    if (area < settings.epsilon) {
      return
    }
    normal.scaleInPlace(1 / area)
    points[vertex].subtractToRef(points[first], offset)
    const distance = Vector3.Dot(offset, normal)
    const prior = Vector3.Dot(previous[vertex].subtract(previous[first]), normal)
    const side = prior < 0 ? -1 : 1
    if (distance * side >= settings.thickness) {
      return
    }
    if (!barycentric(edge, other, offset, weights)) {
      return
    }
    const mass =
      (pinned[vertex] ? 0 : 1) +
      triangle.reduce((sum, index, corner) => sum + (pinned[index] ? 0 : weights[corner] ** 2), 0)
    if (mass === 0) {
      return
    }
    normal.scaleInPlace((side * (settings.thickness - side * distance)) / mass)
    const correction = normal.length()
    if (!Number.isFinite(correction)) {
      return
    }
    if (correction > settings.maxCorrection) {
      normal.scaleInPlace(settings.maxCorrection / correction)
    }
    if (!pinned[vertex]) {
      points[vertex].addInPlace(normal)
    }
    triangle.forEach((index, corner) => {
      if (!pinned[index]) {
        points[index].addInPlaceFromFloats(
          -normal.x * weights[corner],
          -normal.y * weights[corner],
          -normal.z * weights[corner],
        )
      }
    })
  }
  return {
    solve(points, previous) {
      grid.clear()
      oversized.length = 0
      triangles.forEach((triangle, index) => {
        const {minimum, maximum} = bounds[index]
        minimum.set(Infinity, Infinity, Infinity)
        maximum.set(-Infinity, -Infinity, -Infinity)
        triangle.forEach((vertex) => {
          minimum.minimizeInPlace(points[vertex]).minimizeInPlace(previous[vertex])
          maximum.maximizeInPlace(points[vertex]).maximizeInPlace(previous[vertex])
        })
        minimum.addInPlaceFromFloats(-settings.thickness, -settings.thickness, -settings.thickness)
        maximum.addInPlaceFromFloats(settings.thickness, settings.thickness, settings.thickness)
        const indexed = cells(minimum, maximum, (key) => {
          const bucket = grid.get(key)
          if (bucket === undefined) {
            grid.set(key, [index])
          } else {
            bucket.push(index)
          }
        })
        if (!indexed) {
          oversized.push(index)
        }
      })
      points.forEach((point, vertex) => {
        candidates.clear()
        oversized.forEach((index) => candidates.add(index))
        const indexed = cells(
          Vector3.Minimize(point, previous[vertex]),
          Vector3.Maximize(point, previous[vertex]),
          (key) => grid.get(key)?.forEach((index) => candidates.add(index)),
        )
        if (!indexed) {
          triangles.forEach((_, index) => candidates.add(index))
        }
        for (const candidate of candidates) {
          project(vertex, candidate, points, previous)
        }
      })
    },
  }
}
