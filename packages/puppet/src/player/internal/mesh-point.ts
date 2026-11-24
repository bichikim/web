interface MeshPointOptions {
  /** XY coordinates of the currently drawn mesh. */
  readonly vertices: ArrayLike<number>
  /** Indices of currently drawn triangles, including culling. */
  readonly indices: ArrayLike<number>
  /** Point in the same coordinate system as the vertices. */
  readonly point: {readonly x: number; readonly y: number}
}
interface MeshPoint {
  readonly indices: readonly [number, number, number]
  readonly weights: readonly [number, number, number]
}

const TRIANGLE_SIZE = 3

/** Returns the containing triangle and barycentric weights; degenerate or missing geometry covers nothing. */
export const meshPoint = (options: MeshPointOptions): MeshPoint | undefined => {
  const {vertices, indices, point} = options
  for (let offset = 0; offset + 2 < indices.length; offset += TRIANGLE_SIZE) {
    const first = indices[offset]!
    const second = indices[offset + 1]!
    const third = indices[offset + 2]!
    const ax = vertices[first * 2]!
    const ay = vertices[first * 2 + 1]!
    const bx = vertices[second * 2]!
    const by = vertices[second * 2 + 1]!
    const cx = vertices[third * 2]!
    const cy = vertices[third * 2 + 1]!
    const area = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if (Number.isFinite(area) && area !== 0) {
      const firstWeight = ((by - cy) * (point.x - cx) + (cx - bx) * (point.y - cy)) / area
      const secondWeight = ((cy - ay) * (point.x - cx) + (ax - cx) * (point.y - cy)) / area
      const thirdWeight = 1 - firstWeight - secondWeight
      if (
        [firstWeight, secondWeight, thirdWeight].every(
          (value) => Number.isFinite(value) && value >= 0 && value <= 1,
        )
      ) {
        return {indices: [first, second, third], weights: [firstWeight, secondWeight, thirdWeight]}
      }
    }
  }
  return undefined
}
