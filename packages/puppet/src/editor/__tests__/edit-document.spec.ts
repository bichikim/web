import {describe, expect, it} from 'vitest'

import {validateMesh} from '../../mesh'
import {createDemoDocument} from '../../player/create-demo-document'
import type {PuppetDocument} from '../../player/document'
import {addPartVertex, deletePartVertex, movePartVertex, splitPartTriangle} from '../edit-document'

const PART_ID = 'mesh-preview'
const CENTER_VERTEX_INDEX = 4

const createAnimatedDocument = (): PuppetDocument => ({
  ...createDemoDocument(),
  motions: [
    {
      duration: 1,
      id: 'test-motion',
      tracks: [
        {
          axis: 'x',
          keyframes: [
            {time: 0, value: 320},
            {time: 1, value: 360},
          ],
          partId: PART_ID,
          vertexIndex: CENTER_VERTEX_INDEX,
        },
      ],
    },
  ],
})

describe('movePartVertex', () => {
  it('should replace only the selected vertex coordinates', () => {
    const document = createDemoDocument()
    const result = movePartVertex({
      document,
      partId: PART_ID,
      vertexIndex: CENTER_VERTEX_INDEX,
      x: 310,
      y: 220,
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh.vertices).toEqual([
        ...document.parts[0]!.mesh.vertices.slice(0, 8),
        310,
        220,
      ])
      expect(document.parts[0]?.mesh.vertices.at(-2)).toBe(320)
    }
  })

  it('should move a vertex beyond the texture bounds without changing its UV', () => {
    const document = createDemoDocument()
    const result = movePartVertex({
      document,
      partId: PART_ID,
      vertexIndex: 0,
      x: -80,
      y: -40,
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh.vertices.slice(0, 2)).toEqual([-80, -40])
      expect(result.document.parts[0]?.mesh.uvs.slice(0, 2)).toEqual([0, 0])
      expect(validateMesh(result.document.parts[0]!.mesh)).toEqual({valid: true})
    }
  })

  it('should report a missing part and invalid vertex', () => {
    const document = createDemoDocument()

    expect(movePartVertex({document, partId: 'missing', vertexIndex: 0, x: 0, y: 0})).toEqual({
      error: {code: 'missing-part'},
      ok: false,
    })
    expect(movePartVertex({document, partId: PART_ID, vertexIndex: 99, x: 0, y: 0})).toEqual({
      error: {code: 'invalid-vertex'},
      ok: false,
    })
  })

  it('should reject duplicate and triangle-inverting positions', () => {
    const document = createDemoDocument()

    expect(movePartVertex({document, partId: PART_ID, vertexIndex: 4, x: 0, y: 0})).toEqual({
      error: {code: 'duplicate-vertex'},
      ok: false,
    })
    expect(movePartVertex({document, partId: PART_ID, vertexIndex: 4, x: 700, y: 240})).toEqual({
      error: {code: 'inverted-triangle'},
      ok: false,
    })
  })
})

describe('splitPartTriangle', () => {
  it('should split the containing triangle and append matching UV coordinates', () => {
    const document = createDemoDocument()
    const result = splitPartTriangle({document, partId: PART_ID, x: 320, y: 80})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      expect(result.vertexIndex).toBe(5)
      expect(mesh.vertices.slice(-2)).toEqual([320, 80])
      expect(mesh.uvs.slice(-2)).toEqual([0.5, 1 / 6])
      expect(mesh.indices).toHaveLength(document.parts[0]!.mesh.indices.length + 6)
    }
  })

  it('should split every triangle sharing an edge', () => {
    const document = createDemoDocument()
    const result = addPartVertex({document, partId: PART_ID, x: 160, y: 120})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      expect(mesh.indices).toHaveLength(document.parts[0]!.mesh.indices.length + 6)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should reject a point outside the drawn mesh', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const insetDocument = {
      ...document,
      parts: [
        {
          ...part,
          mesh: {
            ...part.mesh,
            uvs: [0.25, 0.25, 0.75, 0.25, 0.75, 0.75, 0.25, 0.75, 0.5, 0.5],
            vertices: [160, 120, 480, 120, 480, 360, 160, 360, 320, 240],
          },
        },
      ],
    }
    const result = addPartVertex({document: insetDocument, partId: PART_ID, x: 80, y: 240})

    expect(result).toEqual({error: {code: 'outside-mesh'}, ok: false})
    expect(insetDocument.parts[0]?.mesh.vertices).toEqual([
      160, 120, 480, 120, 480, 360, 160, 360, 320, 240,
    ])
  })

  it('should add a boundary vertex outside the texture using interpolated UV coordinates', () => {
    const document = createDemoDocument()
    const moved = movePartVertex({document, partId: PART_ID, vertexIndex: 0, x: -80, y: -40})

    expect(moved.ok).toBe(true)

    if (!moved.ok) {
      return
    }

    const result = addPartVertex({document: moved.document, partId: PART_ID, x: 280, y: -20})

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh.vertices.slice(-2)).toEqual([280, -20])
      expect(result.document.parts[0]?.mesh.uvs.slice(-2)).toEqual([0.5, 0])
      expect(validateMesh(result.document.parts[0]!.mesh)).toEqual({valid: true})
    }
  })

  it('should reject a non-finite point', () => {
    expect(
      addPartVertex({document: createDemoDocument(), partId: PART_ID, x: Number.NaN, y: 240}),
    ).toEqual({
      error: {code: 'invalid-position'},
      ok: false,
    })
  })

  it('should reject a duplicate vertex', () => {
    expect(addPartVertex({document: createDemoDocument(), partId: PART_ID, x: 0, y: 0})).toEqual({
      error: {code: 'duplicate-vertex'},
      ok: false,
    })
  })

  it('should reject missing and malformed part topology', () => {
    const document = createDemoDocument()
    const part = document.parts[0]

    expect(part).toBeDefined()

    if (part === undefined) {
      return
    }

    const malformedDocument = {
      ...document,
      parts: [{...part, mesh: {...part.mesh, indices: [99, 1, 2]}}],
    }
    const incompleteDocument = {
      ...document,
      parts: [{...part, mesh: {...part.mesh, indices: [0, 1]}}],
    }

    expect(splitPartTriangle({document, partId: 'missing', x: 0, y: 0})).toEqual({
      error: {code: 'missing-part'},
      ok: false,
    })
    expect(splitPartTriangle({document: malformedDocument, partId: PART_ID, x: 0, y: 0})).toEqual({
      error: {code: 'invalid-mesh'},
      ok: false,
    })
    expect(splitPartTriangle({document: incompleteDocument, partId: PART_ID, x: 0, y: 0})).toEqual({
      error: {code: 'invalid-mesh'},
      ok: false,
    })
  })
})

describe('deletePartVertex', () => {
  it('should remove a redundant collinear boundary vertex', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const fanDocument = {
      ...document,
      motions: [],
      parts: [
        {
          ...part,
          mesh: {
            indices: [0, 1, 5, 1, 2, 5, 2, 3, 5, 3, 4, 5, 4, 0, 5],
            uvs: [0, 0, 0.5, 0, 1, 0, 1, 1, 0, 1, 0.5, 0.5],
            vertices: [0, 0, 320, 0, 640, 0, 640, 480, 0, 480, 320, 240],
          },
        },
      ],
    }
    const result = deletePartVertex({document: fanDocument, partId: PART_ID, vertexIndex: 1})

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh.vertices).toHaveLength(10)
      expect(result.document.parts[0]?.mesh.indices).toHaveLength(12)
      expect(validateMesh(result.document.parts[0]!.mesh)).toEqual({valid: true})
    }
  })

  it('should retriangulate the hole left by an interior vertex', () => {
    const result = deletePartVertex({
      document: createAnimatedDocument(),
      partId: PART_ID,
      vertexIndex: CENTER_VERTEX_INDEX,
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh.indices).toHaveLength(6)
      expect(result.document.motions[0]?.tracks).toEqual([])
      expect(validateMesh(result.document.parts[0]!.mesh)).toEqual({valid: true})
    }
  })

  it('should move the center vertex to a deleted original image corner', () => {
    const document = createAnimatedDocument()
    const result = deletePartVertex({document, partId: PART_ID, vertexIndex: 0})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh

      expect(mesh.vertices).toEqual([640, 0, 640, 480, 0, 480, 0, 0])
      expect(mesh.uvs).toEqual([1, 0, 1, 1, 0, 1, 0, 0])
      expect(mesh.indices).toHaveLength(6)
      expect(mesh.boundaryLoops?.[0]).toHaveLength(4)
      expect(result.document.motions[0]?.tracks[0]?.vertexIndex).toBe(3)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should move a point on an internal edge to the deleted boundary corner', () => {
    const document = createDemoDocument()
    const added = addPartVertex({document, partId: PART_ID, x: 160, y: 120})

    expect(added.ok).toBe(true)

    if (!added.ok) {
      return
    }

    const result = deletePartVertex({document: added.document, partId: PART_ID, vertexIndex: 0})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      const points = Array.from({length: mesh.vertices.length / 2}, (_, index) => [
        mesh.vertices[index * 2],
        mesh.vertices[index * 2 + 1],
      ])

      expect(points).toContainEqual([0, 0])
      expect(points).not.toContainEqual([160, 120])
      expect(mesh.vertices).toHaveLength(10)
      expect(mesh.uvs.slice(8, 10)).toEqual([0, 0])
      expect(mesh.indices).toHaveLength(12)
      expect(mesh.boundaryLoops?.[0]).toContain(4)
      expect(mesh.boundaryLoops?.[0]).not.toContain(3)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should move a point on an outer edge to its connected deleted corner', () => {
    const document = createDemoDocument()
    const added = addPartVertex({document, partId: PART_ID, x: 160, y: 0})

    expect(added.ok).toBe(true)

    if (!added.ok) {
      return
    }

    const result = deletePartVertex({document: added.document, partId: PART_ID, vertexIndex: 0})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const part = result.document.parts[0]!
      const promotedIndex = part.mesh.vertices.length / 2 - 1

      expect(part.mesh.vertices.slice(-2)).toEqual([0, 0])
      expect(part.mesh.uvs.slice(-2)).toEqual([0, 0])
      expect(part.mesh.indices).toHaveLength(12)
      expect(part.mesh.boundaryLoops?.[0]).toHaveLength(4)
      expect(part.mesh.boundaryLoops?.[0]).toContain(promotedIndex)
      expect(part.mesh.boundaryLoops?.[0]).not.toContain(3)
      expect(validateMesh(part.mesh)).toEqual({valid: true})
    }
  })

  it('should reuse an existing replacement triangle when deleting a connected corner', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const editedDocument = {
      ...document,
      motions: [],
      parts: [
        {
          ...part,
          mesh: {
            indices: [3, 4, 5, 4, 2, 5, 2, 3, 5, 4, 1, 2, 1, 4, 0],
            uvs: [1, 0, 1, 1, 0, 1, 0, 0, 0.5, 0, 0.16, 0.2],
            vertices: [640, 0, 640, 480, 0, 480, 0, 0, 320, 0, 100, 100],
          },
        },
      ],
    }
    const result = deletePartVertex({document: editedDocument, partId: PART_ID, vertexIndex: 3})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh

      expect(mesh.vertices).toEqual([640, 0, 640, 480, 0, 480, 0, 0, 100, 100])
      expect(mesh.uvs.slice(6, 8)).toEqual([0, 0])
      expect(mesh.indices).toHaveLength(12)
      expect(mesh.boundaryLoops?.[0]).toHaveLength(4)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should rebuild the hull when existing triangles subdivide the corner replacement', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const editedDocument = {
      ...document,
      motions: [],
      parts: [
        {
          ...part,
          mesh: {
            indices: [3, 4, 5, 4, 6, 5, 4, 0, 6, 0, 1, 6, 1, 2, 6, 2, 5, 6, 2, 3, 5],
            uvs: [1, 0, 1, 1, 0, 1, 0, 0, 0.5, 0, 0.1875, 0.25, 0.5, 0.5],
            vertices: [640, 0, 640, 480, 0, 480, 0, 0, 320, 0, 120, 120, 320, 240],
          },
        },
      ],
    }

    expect(validateMesh(editedDocument.parts[0]!.mesh)).toEqual({valid: true})

    const result = deletePartVertex({document: editedDocument, partId: PART_ID, vertexIndex: 3})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh

      expect(mesh.vertices).toEqual([640, 0, 640, 480, 0, 480, 0, 0, 120, 120, 320, 240])
      expect(mesh.uvs.slice(6, 8)).toEqual([0, 0])
      expect(mesh.indices).toHaveLength(18)
      expect(mesh.boundaryLoops?.[0]).toHaveLength(4)
      expect(mesh.boundaryLoops?.[0]).toContain(3)
      expect(mesh.boundaryLoops?.[0]).not.toContain(4)
      expect(mesh.boundaryLoops?.[0]).not.toContain(5)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should preserve each outer corner position by promoting an adjacent vertex', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const gridDocument = {
      ...document,
      motions: [],
      parts: [
        {
          ...part,
          mesh: {
            indices: [0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 3, 4, 7, 3, 7, 6, 4, 5, 8, 4, 8, 7],
            uvs: [0, 0, 0.5, 0, 1, 0, 0, 0.5, 0.5, 0.5, 1, 0.5, 0, 1, 0.5, 1, 1, 1],
            vertices: [
              0, 0, 320, 0, 640, 0, 0, 240, 320, 240, 640, 240, 0, 480, 320, 480, 640, 480,
            ],
          },
        },
      ],
    }
    const corners = [
      {x: 0, y: 0},
      {x: 640, y: 0},
      {x: 640, y: 480},
      {x: 0, y: 480},
    ]

    for (const corner of corners) {
      const vertices = gridDocument.parts[0]!.mesh.vertices
      const vertexIndex =
        vertices.findIndex(
          (coordinate, index) =>
            index % 2 === 0 && coordinate === corner.x && vertices[index + 1] === corner.y,
        ) / 2
      const result = deletePartVertex({
        document: gridDocument,
        partId: PART_ID,
        vertexIndex,
      })

      expect(result.ok).toBe(true)

      if (result.ok) {
        const mesh = result.document.parts[0]!.mesh
        expect(
          Array.from({length: mesh.vertices.length / 2}, (_, index) => [
            mesh.vertices[index * 2],
            mesh.vertices[index * 2 + 1],
          ]),
        ).toContainEqual([corner.x, corner.y])
        expect(mesh.vertices).toHaveLength(16)
        expect(mesh.uvs).toHaveLength(16)
        expect(mesh.indices.length).toBeGreaterThanOrEqual(18)
        expect(mesh.boundaryLoops?.flat().length).toBeGreaterThanOrEqual(7)
        expect(validateMesh(mesh)).toEqual({valid: true})
      }
    }
  })

  it('should allow another interior vertex after promoting the center corner', () => {
    const initialDocument = createDemoDocument()
    const deleted = deletePartVertex({
      document: initialDocument,
      partId: PART_ID,
      vertexIndex: 0,
    })

    expect(deleted.ok).toBe(true)

    if (!deleted.ok) {
      return
    }

    const added = addPartVertex({
      document: deleted.document,
      partId: PART_ID,
      x: 480,
      y: 240,
    })

    expect(added.ok).toBe(true)

    if (added.ok) {
      const mesh = added.document.parts[0]!.mesh

      expect(mesh.vertices).toHaveLength(10)
      expect(mesh.uvs.slice(-2)).toEqual([0.75, 0.5])
      expect(mesh.indices).toHaveLength(12)
      expect(mesh.boundaryLoops?.[0]).toHaveLength(4)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should reject a missing part and invalid vertex', () => {
    const document = createDemoDocument()

    expect(deletePartVertex({document, partId: 'missing', vertexIndex: 0})).toEqual({
      error: {code: 'missing-part'},
      ok: false,
    })
    expect(deletePartVertex({document, partId: PART_ID, vertexIndex: -1})).toEqual({
      error: {code: 'invalid-vertex'},
      ok: false,
    })
  })

  it('should reject deletion when only four vertices remain', () => {
    const reduced = deletePartVertex({
      document: createDemoDocument(),
      partId: PART_ID,
      vertexIndex: CENTER_VERTEX_INDEX,
    })

    expect(reduced.ok).toBe(true)

    if (reduced.ok) {
      expect(reduced.document.parts[0]?.mesh.vertices).toHaveLength(8)
      expect(
        deletePartVertex({document: reduced.document, partId: PART_ID, vertexIndex: 0}),
      ).toEqual({
        error: {code: 'minimum-vertex-count'},
        ok: false,
      })
    }
  })

  it('should edit only the requested part', () => {
    const document = createDemoDocument()
    const firstPart = document.parts[0]!
    const secondPart = {...firstPart, id: 'second'}
    const multiPartDocument = {...document, parts: [firstPart, secondPart]}
    const result = deletePartVertex({
      document: multiPartDocument,
      partId: secondPart.id,
      vertexIndex: CENTER_VERTEX_INDEX,
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]).toBe(firstPart)
      expect(result.document.parts[1]?.mesh.vertices).toHaveLength(8)
    }
  })
})
