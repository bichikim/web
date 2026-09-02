import {describe, expect, it, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'

describe('parseDocument', () => {
  it('should parse a serialized valid document', () => {
    const document = createDemoDocument()

    expect(parseDocument(serializeDocument(document))).toEqual({document, ok: true})
  })

  it('should reject fractional texture pixel dimensions', () => {
    const document = createDemoDocument()
    const fractionalDocument = {
      ...document,
      parts: document.parts.map((part, index) =>
        index === 0 ? {...part, texture: {...part.texture, width: part.texture.width + 0.5}} : part,
      ),
    }

    expect(parseDocument(JSON.stringify(fractionalDocument))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should preserve supported easing and reject unknown easing', () => {
    const document = createDemoDocument()
    const track = document.motions[0]!.tracks[0]!
    const easedDocument = {
      ...document,
      motions: [
        {
          ...document.motions[0]!,
          tracks: [
            {
              ...track,
              keyframes: [
                {...track.keyframes[0]!, easing: 'ease-out'},
                ...track.keyframes.slice(1),
              ],
            },
          ],
        },
      ],
    }

    expect(parseDocument(JSON.stringify(easedDocument))).toMatchObject({
      document: easedDocument,
      ok: true,
    })
    expect(
      parseDocument(
        JSON.stringify({
          ...easedDocument,
          motions: [
            {
              ...easedDocument.motions[0],
              tracks: [
                {
                  ...easedDocument.motions[0].tracks[0],
                  keyframes: [{easing: 'bounce', time: 0, value: 240}],
                },
              ],
            },
          ],
        }),
      ),
    ).toEqual({error: {code: 'invalid-document'}, ok: false})
  })

  it('should validate parameter keyform targets and coordinate counts', () => {
    const document = createDemoDocument()
    const parameter = document.parameters?.[0]

    expect(parameter).toBeDefined()

    const invalidDocument = {
      ...document,
      parameters: [
        {
          ...parameter!,
          keyforms: [
            {
              parts: [{partId: 'mesh-preview', vertices: [0, 0]}],
              value: 0,
            },
          ],
        },
      ],
    }

    expect(parseDocument(JSON.stringify(invalidDocument))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should validate explicit parameter target membership', () => {
    const document = createDemoDocument()
    const parameter = document.parameters?.[0]

    expect(parameter).toBeDefined()
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parameters: [{...parameter, targetPartIds: ['missing-part']}],
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parameters: [{...parameter, targetPartIds: ['mesh-preview', 'shape-circle']}],
        }),
      ),
    ).toMatchObject({ok: false})
  })

  it('should continue accepting documents created before parameters were added', () => {
    const legacyDocument = {...createDemoDocument(), parameters: undefined, scene: undefined}

    expect(parseDocument(JSON.stringify(legacyDocument))).toMatchObject({ok: true})
    expect(JSON.parse(serializeDocument(legacyDocument))).toHaveProperty('scene.roots')
  })

  it('should continue accepting parameters that infer targets from keyforms', () => {
    const document = createDemoDocument()
    const parameter = document.parameters?.[0]

    expect(parameter).toBeDefined()
    const legacyParameter = {...parameter!, targetPartIds: undefined}

    expect(
      parseDocument(JSON.stringify({...document, parameters: [legacyParameter]})),
    ).toMatchObject({ok: true})
  })

  test('should validate scene targets, uniqueness and complete part coverage', () => {
    const document = createDemoDocument()
    const firstNode = document.scene!.roots[0]!

    expect(
      parseDocument(JSON.stringify({...document, scene: {roots: [firstNode, {...firstNode}]}})),
    ).toEqual({error: {code: 'invalid-document'}, ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          scene: {roots: [{...firstNode, id: 'missing-part'}]},
        }),
      ),
    ).toEqual({error: {code: 'invalid-document'}, ok: false})
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
      scene: undefined,
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
      scene: undefined,
    }

    const result = parseDocument(JSON.stringify(invalidDocument))

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh).not.toHaveProperty('controlVertexIndices')
    }
  })
})
