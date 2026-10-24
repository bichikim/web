import {describe, expect, it} from 'vitest'

import {deduplicateTriangles, replaceTriangleVertex} from '../triangles'

describe('triangle utilities', () => {
  it('should replace a vertex while preserving the triangle tuple', () => {
    expect(replaceTriangleVertex([4, 2, 7], 2, 1)).toEqual([4, 1, 7])
  })

  it('should retain the first triangle for each orientation-independent key', () => {
    expect(
      deduplicateTriangles([
        [0, 1, 2],
        [2, 0, 1],
        [0, 2, 3],
      ]),
    ).toEqual([
      [0, 1, 2],
      [0, 2, 3],
    ])
  })
})
