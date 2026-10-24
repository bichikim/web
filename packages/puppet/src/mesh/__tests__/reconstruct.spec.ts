import {describe, expect, it} from 'vitest'

import type {PuppetMesh} from '../../player'
import {reconstructMesh} from '../reconstruct'
import {validateMesh} from '../validate'

describe('reconstructMesh', () => {
  it('should replace a poor internal diagonal while preserving the outer boundary', () => {
    const mesh: PuppetMesh = {
      boundaryLoops: [[0, 1, 2, 3]],
      indices: [0, 1, 2, 0, 2, 3],
      uvs: [0, 0, 1, 0, 1, 1, 0, 1],
      vertices: [0, 0, 10, 0, 10, 10, 0, 1],
    }
    const result = reconstructMesh(mesh)

    expect(result.indices).toEqual([1, 3, 0, 3, 1, 2])
    expect(result.boundaryLoops).toEqual([[3, 0, 1, 2]])
    expect(validateMesh(result)).toEqual({valid: true})
  })

  it('should preserve a triangulation when no internal edge improves it', () => {
    const mesh: PuppetMesh = {
      boundaryLoops: [[0, 1, 2]],
      indices: [0, 1, 2],
      uvs: [0, 0, 1, 0, 0, 1],
      vertices: [0, 0, 10, 0, 0, 10],
    }

    expect(reconstructMesh(mesh)).toEqual(mesh)
  })
})
