import {describe, expect, it, test} from 'vitest'

import type {PuppetMesh} from '../../player'
import {validateMesh} from '../validate'

const createMesh = (overrides: Partial<PuppetMesh> = {}): PuppetMesh => ({
  boundaryLoops: [[0, 1, 2]],
  indices: [0, 1, 2],
  uvs: [0, 0, 1, 0, 0, 1],
  vertices: [0, 0, 10, 0, 0, 10],
  ...overrides,
})

describe('validateMesh', () => {
  it('should accept a valid triangle mesh', () => {
    expect(validateMesh(createMesh())).toEqual({valid: true})
  })

  it('should report malformed coordinate, UV, and index buffers', () => {
    expect(validateMesh(createMesh({indices: [0, 1], uvs: [], vertices: [0, 0, 1]}))).toEqual({
      issues: ['invalid-coordinate-count', 'invalid-uv-count', 'invalid-index'],
      valid: false,
    })
  })

  it('should report a boundary that does not match the triangle exterior', () => {
    expect(validateMesh(createMesh({boundaryLoops: [[0, 1, 1]]}))).toEqual({
      issues: ['invalid-boundary'],
      valid: false,
    })
    expect(validateMesh(createMesh({boundaryLoops: [[0, 1, 3]]}))).toEqual({
      issues: ['invalid-boundary'],
      valid: false,
    })
    expect(validateMesh(createMesh({boundaryLoops: []}))).toEqual({
      issues: ['invalid-boundary'],
      valid: false,
    })
  })

  it('should report duplicate vertices and degenerate triangles', () => {
    expect(validateMesh(createMesh({vertices: [0, 0, 10, 0, 0, 0]}))).toEqual({
      issues: ['degenerate-triangle', 'duplicate-vertex'],
      valid: false,
    })
  })

  it('should detect duplicate vertices within the geometry tolerance', () => {
    expect(
      validateMesh(
        createMesh({
          indices: [0, 1, 2, 0, 2, 3],
          uvs: [0, 0, 1, 0, 0, 1, 0, 0],
          vertices: [0, 0, 10, 0, 0, 10, 0.000_000_5, 0],
        }),
      ),
    ).toEqual(
      expect.objectContaining({issues: expect.arrayContaining(['duplicate-vertex']), valid: false}),
    )
  })

  test.each([
    [-0.000_000_1, 0, 0.000_000_1, 0],
    [0.000_001_9, 0.000_001_9, 0.000_002_1, 0.000_002_1],
    [1e308, 0, 1e308, 0],
    [1e9, 0, 1e9 + 0.000_000_5, 0],
  ])('should find close vertices across coordinate buckets: %j', (...points) => {
    const vertices = [0, 10, 10, 10, 0, 20, ...points]
    const result = validateMesh(createMesh({uvs: vertices.map(() => 0), vertices}))
    expect(result).toMatchObject({
      issues: expect.arrayContaining(['duplicate-vertex']),
      valid: false,
    })
  })

  test('should accept distinct vertices aligned along the same X coordinates', () => {
    const count = 2000
    const vertices = Array.from({length: count * 2}, (_, index) =>
      index % 2 === 0 ? Math.floor(index / 2) % 2 : Math.floor(index / 4),
    )
    expect(validateMesh(createMesh({uvs: vertices.map(() => 0), vertices}))).toEqual({valid: true})
  })

  test('should retain distinct vertices sharing a coordinate bucket', () => {
    const vertices = [0, 10, 10, 10, 0, 20, 0, 0, 0.000_000_9, 0.000_000_9]
    expect(validateMesh(createMesh({uvs: vertices.map(() => 0), vertices}))).toEqual({valid: true})
  })

  it('should report duplicate triangles and non-manifold edges', () => {
    const result = validateMesh(createMesh({indices: [0, 1, 2, 0, 1, 2, 0, 1, 2]}))

    expect(result.valid).toBe(false)

    if (!result.valid) {
      expect(result.issues).toEqual(
        expect.arrayContaining(['duplicate-triangle', 'non-manifold-edge']),
      )
    }
  })

  it('should report crossing edges', () => {
    const result = validateMesh({
      indices: [0, 1, 2, 3, 4, 5],
      uvs: [0, 0, 1, 1, 0, 1, 1, 0, 0, 0.5, 1, 0.5],
      vertices: [0, 0, 10, 10, 0, 10, 10, 0, 0, 5, 10, 5],
    })

    expect(result.valid).toBe(false)

    if (!result.valid) {
      expect(result.issues).toContain('intersecting-edges')
    }
  })

  it('should report a triangle contained inside another triangle', () => {
    const result = validateMesh({
      indices: [0, 1, 2, 3, 4, 5],
      uvs: [0, 0, 1, 0, 0, 1, 0.2, 0.2, 0.3, 0.2, 0.2, 0.3],
      vertices: [0, 0, 10, 0, 0, 10, 2, 2, 3, 2, 2, 3],
    })

    expect(result.valid).toBe(false)

    if (!result.valid) {
      expect(result.issues).toContain('intersecting-triangles')
    }
  })

  it('should report contained triangles that share a vertex', () => {
    const result = validateMesh({
      indices: [0, 1, 2, 0, 3, 4],
      uvs: [0, 0, 1, 0, 0, 1, 0.2, 0.1, 0.1, 0.2],
      vertices: [0, 0, 10, 0, 0, 10, 2, 1, 1, 2],
    })

    expect(result.valid).toBe(false)

    if (!result.valid) {
      expect(result.issues).toContain('intersecting-triangles')
    }
  })
})

test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  'should reject a non-finite vertex coordinate %s',
  (coordinate) => {
    expect(
      validateMesh({
        indices: [0, 1, 2],
        uvs: [0, 0, 1, 0, 0, 1],
        vertices: [coordinate, 0, 1, 0, 0, 1],
      }),
    ).toMatchObject({valid: false})
  },
)
test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  'should reject a non-finite UV coordinate %s',
  (coordinate) => {
    expect(
      validateMesh({
        indices: [0, 1, 2],
        uvs: [coordinate, 0, 1, 0, 0, 1],
        vertices: [0, 0, 1, 0, 0, 1],
      }),
    ).toMatchObject({valid: false})
  },
)
