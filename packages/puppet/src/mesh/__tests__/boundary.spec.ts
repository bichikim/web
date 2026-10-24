import {describe, expect, it} from 'vitest'

import {deriveBoundaryLoops, getBoundaryEdges, withBoundaryLoops} from '../boundary'

describe('mesh boundary', () => {
  it('should derive the outer loop while excluding shared triangle edges', () => {
    const mesh = {
      indices: [0, 1, 2, 0, 2, 3],
      uvs: [0, 0, 1, 0, 1, 1, 0, 1],
      vertices: [0, 0, 10, 0, 10, 10, 0, 10],
    }

    expect(getBoundaryEdges(mesh)).toHaveLength(4)
    expect(deriveBoundaryLoops(mesh)).toEqual([[0, 1, 2, 3]])
    expect(withBoundaryLoops(mesh)).toEqual({...mesh, boundaryLoops: [[0, 1, 2, 3]]})
  })

  it('should preserve disconnected regions as separate loops', () => {
    expect(deriveBoundaryLoops({indices: [0, 1, 2, 3, 4, 5]})).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ])
  })
})
