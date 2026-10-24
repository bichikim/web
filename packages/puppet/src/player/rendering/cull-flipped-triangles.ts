const TRIANGLE_SIZE = 3
const Y_OFFSET = 1

/** Twice the signed area of triangle `a, b, c` in an XY pair array. */
const signedArea = (vertices: ArrayLike<number>, triangle: readonly [number, number, number]) => {
  const horizontal = (index: number) => vertices[triangle[index]! * 2] ?? 0
  const vertical = (index: number) => vertices[triangle[index]! * 2 + Y_OFFSET] ?? 0
  return (
    (horizontal(1) - horizontal(0)) * (vertical(2) - vertical(0)) -
    (horizontal(2) - horizontal(0)) * (vertical(1) - vertical(0))
  )
}

/**
 * `indices` with every triangle that `vertices` turned over relative to `restVertices`
 * collapsed onto its first vertex, so the index count stays the same.
 */
export const cullFlippedTriangles = (
  indices: ArrayLike<number>,
  restVertices: ArrayLike<number>,
  vertices: ArrayLike<number>,
): Uint32Array => {
  const culled = Uint32Array.from(indices)
  for (let start = 0; start + TRIANGLE_SIZE <= culled.length; start += TRIANGLE_SIZE) {
    const [first = 0, second = 0, third = 0] = culled.subarray(start, start + TRIANGLE_SIZE)
    const triangle = [first, second, third] as const
    if (signedArea(restVertices, triangle) * signedArea(vertices, triangle) < 0) {
      culled.fill(first, start, start + TRIANGLE_SIZE)
    }
  }
  return culled
}
