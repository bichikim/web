import {describe, expect, it} from 'vitest'

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

  it('should detect duplicate vertices within the geometry tolerance after sorting', () => {
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
