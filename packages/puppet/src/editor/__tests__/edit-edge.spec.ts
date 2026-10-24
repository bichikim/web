import {describe, expect, it} from 'vitest'

import {validateMesh} from '../../mesh'
import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../../player'
import {collapsePartEdge, connectPartVertices, flipPartEdge} from '../edit-edge'

const PART_ID = 'quad'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parts: [
    {
      id: PART_ID,
      mesh: {
        indices: [0, 1, 2, 0, 2, 3],
        uvs: [0, 0, 1, 0, 1, 1, 0, 1],
        vertices: [0, 0, 100, 0, 100, 100, 0, 100],
      },
      texture: {height: 100, src: 'data:image/png;base64,test', width: 100},
    },
  ],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 100, width: 100},
})

describe('flipPartEdge', () => {
  it('should replace an internal diagonal with the opposite diagonal', () => {
    const result = flipPartEdge({
      document: createDocument(),
      firstVertexIndex: 0,
      partId: PART_ID,
      secondVertexIndex: 2,
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      expect(mesh.indices).toEqual([1, 3, 0, 3, 1, 2])
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should reject a boundary edge', () => {
    expect(
      flipPartEdge({
        document: createDocument(),
        firstVertexIndex: 0,
        partId: PART_ID,
        secondVertexIndex: 1,
      }),
    ).toEqual({error: {code: 'invalid-edge'}, ok: false})
  })
})

describe('connectPartVertices', () => {
  it('should insert a requested edge by flipping crossed edges', () => {
    const result = connectPartVertices({
      document: createDocument(),
      firstVertexIndex: 1,
      partId: PART_ID,
      secondVertexIndex: 3,
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      const edgePairs = Array.from({length: mesh.indices.length / 3}, (_, index) =>
        mesh.indices.slice(index * 3, index * 3 + 3),
      ).flatMap(([first, second, third]) => [
        [first, second],
        [second, third],
        [third, first],
      ])

      expect(edgePairs).toEqual(expect.arrayContaining([[1, 3]]))
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should reject an existing edge', () => {
    expect(
      connectPartVertices({
        document: createDocument(),
        firstVertexIndex: 0,
        partId: PART_ID,
        secondVertexIndex: 1,
      }),
    ).toEqual({error: {code: 'edge-exists'}, ok: false})
  })
})

describe('collapsePartEdge', () => {
  it('should merge two connected vertices and remove degenerate triangles', () => {
    const result = collapsePartEdge({
      document: createDocument(),
      firstVertexIndex: 0,
      partId: PART_ID,
      secondVertexIndex: 1,
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      expect(mesh.vertices).toEqual([50, 0, 100, 100, 0, 100])
      expect(mesh.indices).toHaveLength(3)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should reject disconnected vertices and a missing part', () => {
    expect(
      collapsePartEdge({
        document: createDocument(),
        firstVertexIndex: 1,
        partId: PART_ID,
        secondVertexIndex: 3,
      }),
    ).toEqual({error: {code: 'invalid-edge'}, ok: false})
    expect(
      collapsePartEdge({
        document: createDocument(),
        firstVertexIndex: 0,
        partId: 'missing',
        secondVertexIndex: 1,
      }),
    ).toEqual({error: {code: 'missing-part'}, ok: false})
  })

  it('should reject collapsing an edge when only three vertices remain', () => {
    const document = createDocument()
    const part = document.parts[0]!
    const triangleDocument: PuppetDocument = {
      ...document,
      parts: [
        {
          ...part,
          mesh: {
            boundaryLoops: [[0, 1, 2]],
            indices: [0, 1, 2],
            uvs: [0, 0, 1, 0, 0, 1],
            vertices: [0, 0, 100, 0, 0, 100],
          },
        },
      ],
    }

    expect(
      collapsePartEdge({
        document: triangleDocument,
        firstVertexIndex: 0,
        partId: PART_ID,
        secondVertexIndex: 1,
      }),
    ).toEqual({error: {code: 'minimum-vertex-count'}, ok: false})
  })
})
