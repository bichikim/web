import type {PuppetDocument} from '../document'

export interface FindHitAreaOptions {
  readonly document: PuppetDocument
  /** Part IDs in paint order, back to front. */
  readonly paintOrder: ReadonlyArray<string>
  readonly point: {readonly x: number; readonly y: number}
  /** Deformed XY pairs in document coordinates. */
  readonly vertices: (partId: string) => ArrayLike<number> | undefined
}

const COORDINATES_PER_VERTEX = 2

const TRIANGLE_SIZE = 3

type Point = FindHitAreaOptions['point']

const side = (from: Point, to: Point, point: Point) =>
  (to.x - from.x) * (point.y - from.y) - (to.y - from.y) * (point.x - from.x)

const containsInTriangle = (corners: ReadonlyArray<Point>, point: Point) => {
  const [first, second, third] = corners as [Point, Point, Point]
  // Twice the signed area: a collapsed or non-finite triangle covers nothing.
  const area = side(first, second, third)
  if (!Number.isFinite(area) || area === 0) {
    return false
  }
  return corners.every(
    (corner, index) => side(corner, corners[(index + 1) % corners.length]!, point) * area >= 0,
  )
}

const contains = (vertices: ArrayLike<number>, indices: ReadonlyArray<number>, point: Point) => {
  const at = (index: number): Point => ({
    x: vertices[index * COORDINATES_PER_VERTEX] ?? Number.NaN,
    y: vertices[index * COORDINATES_PER_VERTEX + 1] ?? Number.NaN,
  })
  return Array.from({length: Math.floor(indices.length / TRIANGLE_SIZE)}, (_, triangle) =>
    indices.slice(triangle * TRIANGLE_SIZE, (triangle + 1) * TRIANGLE_SIZE).map(at),
  ).some((corners) => containsInTriangle(corners, point))
}

/** The hit area whose topmost part contains `point`, if any. */
export const findHitArea = (options: FindHitAreaOptions): string | undefined => {
  const areaByPartId = new Map(
    (options.document.hitAreas ?? []).flatMap((area) =>
      area.partIds.map((partId) => [partId, area.id] as const),
    ),
  )
  const partById = new Map(options.document.parts.map((part) => [part.id, part]))
  const partId = options.paintOrder.toReversed().find((id) => {
    const vertices = options.vertices(id)
    const part = partById.get(id)
    return (
      areaByPartId.has(id) &&
      vertices !== undefined &&
      part !== undefined &&
      contains(vertices, part.mesh.indices, options.point)
    )
  })
  return partId === undefined ? undefined : areaByPartId.get(partId)
}
