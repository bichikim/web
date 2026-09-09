import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../player/create-demo-document'
import type {PuppetDocument} from '../../player/document'
import {moveMeshVertex} from '../move-mesh-vertex'

const createDocument = (): PuppetDocument => {
  const source = createDemoDocument()
  return {
    ...source,
    motions: [],
    parameters: [{id: 'angle', minimum: 0, name: 'angle', defaultValue: 0, maximum: 1}],
    parameterBindings: [
      {
        id: 'binding',
        parameterIds: ['angle'],
        keyforms: [
          {
            values: [1],
            parts: [{partId: 'part', vertices: [0, 0, 200, 0, 200, 100, 0, 100, 100, 50]}],
          },
        ],
        targetPartIds: ['part'],
      },
    ],
    parts: [
      {
        ...source.parts[0]!,
        id: 'part',
        mesh: {
          vertices: [0, 0, 100, 0, 100, 100, 0, 100, 50, 50],
          uvs: [0, 0, 1, 0, 1, 1, 0, 1, 0.5, 0.5],
          indices: [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4],
        },
      },
    ],
    scene: {
      roots: [
        {
          id: 'part',
          kind: 'part',
          locked: false,
          name: 'part',
          skinning: {
            bind: {xx: 1, xy: 0, yx: 0, x: 0, yy: 1, y: 0},
            influences: [
              {
                inverseBind: {xx: 1, xy: 0, yx: 0, yy: 1, x: 0, y: 0},
                nodeId: 'joint',
                weights: [0, 1, 1, 0, 0.5],
              },
            ],
          },
          visible: true,
        },
      ],
    },
  }
}

describe('moveMeshVertex', () => {
  test('should preserve texture coordinates and resample keyforms and skin weights', () => {
    const source = createDocument()
    const result = moveMeshVertex({document: source, partId: 'part', vertexIndex: 4, x: 75, y: 50})
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(result.document.parts[0]?.mesh.uvs.slice(8)).toEqual([0.75, 0.5])
    expect(
      result.document.parameterBindings?.[0]?.keyforms[0]?.parts[0]?.vertices.slice(8),
    ).toEqual([150, 50])
    const node = result.document.scene?.roots[0]
    expect(node?.kind === 'part' && node.skinning?.influences[0]?.weights[4]).toBe(0.75)
    expect(source.parts[0]?.mesh.vertices.slice(8)).toEqual([50, 50])
  })

  test('should reject moving a boundary corner inward because it removes visible texture', () => {
    const document = createDocument()
    expect(moveMeshVertex({document, partId: 'part', vertexIndex: 0, x: 10, y: 10}).ok).toBe(false)
  })

  test('should allow a straight boundary vertex to slide without changing the outline', () => {
    const source = createDocument()
    const mesh = {
      vertices: [0, 0, 50, 0, 100, 0, 100, 100, 0, 100, 50, 50],
      uvs: [0, 0, 0.5, 0, 1, 0, 1, 1, 0, 1, 0.5, 0.5],
      indices: [0, 1, 5, 1, 2, 5, 2, 3, 5, 3, 4, 5, 4, 0, 5],
    }
    const document = {
      ...source,
      parameterBindings: [],
      scene: undefined,
      parts: [{...source.parts[0]!, mesh}],
    }
    const result = moveMeshVertex({document, partId: 'part', vertexIndex: 1, x: 60, y: 0})
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(result.document.parts[0]!.mesh.uvs[2]).toBeCloseTo(0.6)
    expect(result.document.parts[0]!.mesh.uvs[3]).toBe(0)
  })

  test('should reject a non-affine texture mapping rather than distort the image', () => {
    const source = createDocument()
    const part = source.parts[0]!
    const document = {
      ...source,
      parts: [{...part, mesh: {...part.mesh, uvs: [0, 0, 1, 0, 1, 1, 0, 1, 0.7, 0.5]}}],
    }
    expect(moveMeshVertex({document, partId: 'part', vertexIndex: 4, x: 75, y: 50}).ok).toBe(false)
  })

  test('should reject a move outside the source mesh without changing it', () => {
    const source = createDocument()
    expect(
      moveMeshVertex({document: source, partId: 'part', vertexIndex: 4, x: 200, y: 50}).ok,
    ).toBe(false)
  })

  test('should reject inverted triangles and non-finite coordinates', () => {
    const source = createDocument()
    expect(
      moveMeshVertex({document: source, partId: 'part', vertexIndex: 0, x: 75, y: 75}).ok,
    ).toBe(false)
    expect(
      moveMeshVertex({document: source, partId: 'part', vertexIndex: 4, x: NaN, y: 50}).ok,
    ).toBe(false)
  })
})
