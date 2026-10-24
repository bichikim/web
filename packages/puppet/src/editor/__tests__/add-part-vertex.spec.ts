import {describe, expect, it} from 'vitest'
import {validateMesh} from '../../mesh'
import {createDemoDocument} from '../../player/create-demo-document'
import {addPartVertex} from '../add-part-vertex'
import {movePartVertex} from '../move-part-vertex'

const PART_ID = 'mesh-preview'

describe('addPartVertex', () => {
  it('should split the containing triangle and append matching UV coordinates', () => {
    const document = createDemoDocument()
    const result = addPartVertex({document, partId: PART_ID, x: 320, y: 80})

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

    expect(addPartVertex({document, partId: 'missing', x: 0, y: 0})).toEqual({
      error: {code: 'missing-part'},
      ok: false,
    })
    expect(addPartVertex({document: malformedDocument, partId: PART_ID, x: 0, y: 0})).toEqual({
      error: {code: 'invalid-mesh'},
      ok: false,
    })
    expect(addPartVertex({document: incompleteDocument, partId: PART_ID, x: 0, y: 0})).toEqual({
      error: {code: 'invalid-mesh'},
      ok: false,
    })
  })
})
