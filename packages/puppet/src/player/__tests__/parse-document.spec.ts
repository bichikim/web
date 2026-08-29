import {describe, expect, it} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'

describe('parseDocument', () => {
  it('should parse a serialized valid document', () => {
    const document = createDemoDocument()

    expect(document.motions).toEqual([])
    expect(parseDocument(serializeDocument(document))).toEqual({document, ok: true})
  })

  it('should reject a document containing degenerate topology', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const invalidDocument = {
      ...document,
      parts: [{...part, mesh: {...part.mesh, indices: [0, 0, 1]}}],
    }

    expect(parseDocument(JSON.stringify(invalidDocument))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should derive explicit boundary loops when parsing legacy mesh data', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const legacyDocument = {
      ...document,
      parts: [
        {
          ...part,
          mesh: {indices: part.mesh.indices, uvs: part.mesh.uvs, vertices: part.mesh.vertices},
        },
      ],
    }
    const result = parseDocument(JSON.stringify(legacyDocument))

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh.boundaryLoops).toEqual([[0, 1, 2, 3]])
    }
  })

  it('should reject boundary data that differs from the triangle exterior', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const invalidDocument = {
      ...document,
      parts: [{...part, mesh: {...part.mesh, boundaryLoops: [[0, 1, 4]]}}],
    }

    expect(parseDocument(JSON.stringify(invalidDocument))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should discard obsolete control vertex metadata', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const invalidDocument = {
      ...document,
      parts: [{...part, mesh: {...part.mesh, controlVertexIndices: [0, 0, 5]}}],
    }

    const result = parseDocument(JSON.stringify(invalidDocument))

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh).not.toHaveProperty('controlVertexIndices')
    }
  })
})
