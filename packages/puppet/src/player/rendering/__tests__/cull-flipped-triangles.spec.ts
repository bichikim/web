import {describe, expect, test} from 'vitest'

import {cullFlippedTriangles} from '../cull-flipped-triangles'

describe('cullFlippedTriangles', () => {
  test('should collapse only triangles turned over relative to the rest mesh', () => {
    // Two triangles of a unit square; the second vertex crosses over the first diagonal.
    const indices = [0, 1, 2, 1, 3, 2]
    const rest = [0, 0, 1, 0, 0, 1, 1, 1]
    const folded = [0, 0, -1, 0.5, 0, 1, 1, 1]

    expect([...cullFlippedTriangles(indices, rest, rest)]).toEqual(indices)
    expect([...cullFlippedTriangles(indices, rest, folded)]).toEqual([0, 0, 0, 1, 3, 2])
  })

  test('should keep triangles regardless of their rest winding', () => {
    const indices = [2, 1, 0]
    const rest = [0, 0, 1, 0, 0, 1]
    const mirrored = [0, 0, -1, 0, 0, 1]

    expect([...cullFlippedTriangles(indices, rest, rest)]).toEqual(indices)
    expect([...cullFlippedTriangles(indices, rest, mirrored)]).toEqual([2, 2, 2])
  })
})
