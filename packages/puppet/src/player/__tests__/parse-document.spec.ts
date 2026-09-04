import {describe, expect, it, test} from 'vitest'

import {createDemoDocument} from '../create-demo-document'
import {parseDocument} from '../parse-document'
import {serializeDocument} from '../serialize-document'

const createLegacyDocument = () => {
  const document = createDemoDocument()
  const [parameter] = document.parameters ?? []
  const [binding] = document.parameterBindings ?? []

  if (parameter === undefined || binding === undefined) {
    throw new Error('Expected demo parameters')
  }

  return {
    ...document,
    motions: [],
    parameterBindings: undefined,
    parameters: [
      {
        ...parameter,
        keyforms: binding.keyforms
          .filter((keyform) => keyform.values[1] === 0)
          .map((keyform) => ({parts: keyform.parts, value: keyform.values[0]})),
        targetPartIds: binding.targetPartIds,
      },
    ],
    version: 1,
  }
}

describe('parseDocument', () => {
  it('should parse a serialized valid document', () => {
    const document = createDemoDocument()

    expect(parseDocument(serializeDocument(document))).toEqual({document, ok: true})
  })

  it('should normalize legacy untagged tracks to explicit kinds', () => {
    const document = createDemoDocument()
    const untaggedDocument = {
      ...document,
      motions: document.motions.map((motion) => ({
        ...motion,
        tracks: motion.tracks.map(({kind: _kind, ...track}) => track),
      })),
    }

    expect(parseDocument(JSON.stringify(untaggedDocument))).toMatchObject({
      document: {
        motions: [{tracks: [{kind: 'parameter'}]}],
      },
      ok: true,
    })
  })

  it('should reject a track whose declared kind contradicts its target', () => {
    const document = createDemoDocument()
    const parameterTrack = document.motions[0]!.tracks[0]!
    const invalidDocument = {
      ...document,
      motions: [
        {
          ...document.motions[0]!,
          tracks: [{...parameterTrack, kind: 'vertex'}],
        },
      ],
    }

    expect(parseDocument(JSON.stringify(invalidDocument))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
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

  it('should validate optional part render properties while retaining legacy defaults', () => {
    const source = createDemoDocument()
    const document = {
      ...source,
      parts: source.parts.map((part) =>
        part.id === 'shape-circle' ? {...part, properties: undefined} : part,
      ),
    }
    const part = document.parts[0]!
    const properties = {
      blendMode: 'multiply',
      clippingMaskIds: ['shape-circle'],
      invertedMask: true,
      multiplyColor: [1, 0.5, 0.25],
      opacity: 0.5,
      renderWhenUsedAsMask: true,
      screenColor: [0, 0.25, 0.5],
    }

    const result = parseDocument(
      JSON.stringify({
        ...document,
        parts: [{...part, properties}, ...document.parts.slice(1)],
      }),
    )

    expect(result.ok).toBe(true)
    expect(result.ok ? result.document.parts[0]?.properties : undefined).toEqual(properties)
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parts: [{...part, properties: {...properties, drawOrder: 2}}, ...document.parts.slice(1)],
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parts: [
            {...part, properties: {...properties, renderWhenUsedAsMask: 'yes'}},
            ...document.parts.slice(1),
          ],
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parts: [{...part, properties: {...properties, opacity: 1.1}}, ...document.parts.slice(1)],
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parts: [
            {...part, properties: {...properties, clippingMaskIds: [part.id]}},
            ...document.parts.slice(1),
          ],
        }),
      ),
    ).toMatchObject({ok: false})
  })

  test('should accept chained masks and reject cyclic masks', () => {
    const document = createDemoDocument()
    const chain = {
      ...document,
      parts: document.parts.map((part) => {
        if (part.id === 'mesh-preview') {
          return {...part, properties: {clippingMaskIds: ['shape-circle']}}
        }
        if (part.id === 'shape-diamond') {
          return {...part, properties: {clippingMaskIds: ['mesh-preview']}}
        }
        return {...part, properties: undefined}
      }),
    }
    const cycle = {
      ...chain,
      parts: chain.parts.map((part) =>
        part.id === 'shape-circle'
          ? {...part, properties: {clippingMaskIds: ['mesh-preview']}}
          : part,
      ),
    }

    expect(parseDocument(JSON.stringify(chain)).ok).toBe(true)
    expect(parseDocument(JSON.stringify(cycle))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should parse sparse two-dimensional keyforms', () => {
    const document = createDemoDocument()
    const binding = document.parameterBindings?.[0]
    const sparseDocument = {
      ...document,
      parameterBindings: [
        {
          ...binding!,
          keyforms: binding!.keyforms.filter(
            (keyform) => keyform.values[0] !== 0 || keyform.values[1] !== 0,
          ),
        },
      ],
    }

    expect(parseDocument(JSON.stringify(sparseDocument))).toEqual({
      document: sparseDocument,
      ok: true,
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

  it('should reject a motion track for an unknown parameter', () => {
    const document = createDemoDocument()
    const invalidDocument = {
      ...document,
      motions: document.motions.map((motion) => ({
        ...motion,
        tracks: [{keyframes: [{time: 0, value: 0}], parameterId: 'missing'}],
      })),
    }

    expect(parseDocument(JSON.stringify(invalidDocument))).toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should reject duplicate tracks for one parameter', () => {
    const document = createDemoDocument()
    const track = document.motions[0]?.tracks[0]
    const invalidDocument = {
      ...document,
      motions: document.motions.map((motion) => ({...motion, tracks: [track, track]})),
    }

    expect(parseDocument(JSON.stringify(invalidDocument))).toMatchObject({ok: false})
  })

  it('should reject ambiguous and out-of-range parameter tracks', () => {
    const document = createDemoDocument()
    const parameterTrack = document.motions[0]?.tracks[0]

    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          motions: [
            {
              ...document.motions[0],
              tracks: [{...parameterTrack, axis: 'x', partId: 'mesh-preview', vertexIndex: 0}],
            },
          ],
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          motions: [
            {
              ...document.motions[0],
              tracks: [{keyframes: [{time: 0, value: 31}], parameterId: 'angle-y'}],
            },
          ],
        }),
      ),
    ).toMatchObject({ok: false})
  })

  it('should validate parameter keyform targets and coordinate counts', () => {
    const document = createDemoDocument()
    const binding = document.parameterBindings?.[0]

    expect(binding).toBeDefined()

    const invalidDocument = {
      ...document,
      parameterBindings: [
        {
          ...binding!,
          keyforms: [
            {
              parts: [{partId: 'mesh-preview', vertices: [0, 0]}],
              values: [0, 0],
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
    const binding = document.parameterBindings?.[0]

    expect(binding).toBeDefined()
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parameterBindings: [{...binding, targetPartIds: ['missing-part']}],
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parameterBindings: [{...binding, targetPartIds: ['mesh-preview', 'shape-circle']}],
        }),
      ),
    ).toMatchObject({ok: false})
  })

  it('should continue accepting documents created before parameters were added', () => {
    const legacyDocument = {...createLegacyDocument(), parameters: undefined, scene: undefined}

    expect(parseDocument(JSON.stringify(legacyDocument))).toMatchObject({ok: true})
  })

  it('should reject the obsolete inline parameter shape without changing the document version', () => {
    const legacyDocument = createLegacyDocument()
    const legacyParameter = {...legacyDocument.parameters[0]!, targetPartIds: undefined}
    const result = parseDocument(JSON.stringify({...legacyDocument, parameters: [legacyParameter]}))

    expect(result).toEqual({error: {code: 'invalid-document'}, ok: false})
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

  test('should accept a free-transform deformer and reject removed deformer kinds', () => {
    const document = createDemoDocument()
    const [firstNode, ...remainingNodes] = document.scene!.roots
    const deformer = {
      bounds: {height: 480, width: 640, x: 0, y: 0},
      children: [firstNode],
      columns: 1,
      controlPoints: [0, 0, 640, 0, 0, 480, 640, 480],
      id: 'deformer',
      kind: 'deformer',
      locked: false,
      name: 'Deformer',
      rotationOrigin: {x: 320, y: 240},
      rows: 1,
      visible: true,
    }
    const deformedDocument = {...document, scene: {roots: [deformer, ...remainingNodes]}}

    expect(parseDocument(JSON.stringify(deformedDocument))).toMatchObject({ok: true})
    expect(
      parseDocument(
        JSON.stringify({
          ...deformedDocument,
          scene: {
            roots: [{...deformer, rotationOrigin: {x: 'invalid', y: 240}}, ...remainingNodes],
          },
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...deformedDocument,
          scene: {
            roots: [
              {
                ...deformer,
                curveHandles: [
                  {
                    horizontal: {x: 200, y: 0},
                    pointIndex: 0,
                    vertical: {x: 0, y: 160},
                  },
                ],
              },
              ...remainingNodes,
            ],
          },
        }),
      ),
    ).toMatchObject({ok: true})
    expect(
      parseDocument(
        JSON.stringify({
          ...deformedDocument,
          scene: {
            roots: [
              {
                ...deformer,
                curveHandles: [
                  {
                    horizontal: {x: 200, y: 0},
                    pointIndex: 4,
                    vertical: {x: 0, y: 160},
                  },
                ],
              },
              ...remainingNodes,
            ],
          },
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...deformedDocument,
          scene: {roots: [{...deformer, kind: 'gridDeformer'}, ...remainingNodes]},
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
