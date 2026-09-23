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
  test('should round-trip conditional layer rules and reject invalid references and conditions', () => {
    const document = createDemoDocument()
    const rule = {
      partIds: [document.parts[0]!.id],
      placement: 'after',
      referencePartId: document.parts[1]!.id,
      when: {
        comparison: 'greater-than',
        parameterIds: [document.parameters![0]!.id],
        threshold: 20,
      },
    }
    const source = {...document, layerOrderRules: [rule]}
    const parsed = parseDocument(JSON.stringify(source))
    expect(parsed).toMatchObject({document: {layerOrderRules: [rule]}, ok: true})
    if (parsed.ok) {
      expect(parseDocument(serializeDocument(parsed.document))).toEqual(parsed)
    }
    const invalidRules = [
      null,
      {...rule, partIds: []},
      {...rule, partIds: ['missing']},
      {...rule, partIds: [...rule.partIds, ...rule.partIds]},
      {...rule, referencePartId: rule.partIds[0]},
      {...rule, referencePartId: 'missing'},
      {...rule, placement: 'front'},
      {...rule, when: null},
      {...rule, when: {...rule.when, parameterIds: []}},
      {...rule, when: {...rule.when, parameterIds: ['missing']}},
      {
        ...rule,
        when: {...rule.when, parameterIds: [...rule.when.parameterIds, ...rule.when.parameterIds]},
      },
      {...rule, when: {...rule.when, comparison: 'equal'}},
      {...rule, when: {...rule.when, threshold: '20'}},
      {...rule, when: {...rule.when, threshold: null}},
    ]
    for (const invalidRule of invalidRules) {
      expect(
        parseDocument(JSON.stringify({...document, layerOrderRules: [invalidRule]})),
      ).toMatchObject({ok: false})
    }
    expect(parseDocument(JSON.stringify({...document, layerOrderRules: {}}))).toMatchObject({
      ok: false,
    })
    expect(parseDocument(JSON.stringify({...document, layerOrderRules: []}))).toMatchObject({
      ok: true,
    })
  })

  it('should parse a serialized valid document', () => {
    const document = createDemoDocument()

    expect(parseDocument(serializeDocument(document))).toEqual({document, ok: true})
  })

  it('should accept a positive integer frame rate and retain the legacy default when omitted', () => {
    const document = createDemoDocument()

    expect(parseDocument(JSON.stringify({...document, framesPerSecond: 30}))).toMatchObject({
      document: {framesPerSecond: 30},
      ok: true,
    })
    expect(parseDocument(JSON.stringify(document))).toMatchObject({ok: true})
    expect(parseDocument(JSON.stringify({...document, framesPerSecond: 0}))).toMatchObject({
      ok: false,
    })
    expect(parseDocument(JSON.stringify({...document, framesPerSecond: 23.5}))).toMatchObject({
      ok: false,
    })
    expect(parseDocument(JSON.stringify({...document, framesPerSecond: 241}))).toMatchObject({
      ok: false,
    })
  })

  it('should validate discrete parameter options', () => {
    const document = createDemoDocument()
    const options = [
      {label: '기본', value: 0},
      {label: '하트', value: 1},
      {label: '표고버섯', value: 2},
    ]
    const discreteParameter = {
      defaultValue: 0,
      id: 'eye-symbol',
      maximum: 2,
      minimum: 0,
      name: '눈동자 무늬',
      options,
    }

    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parameters: [...document.parameters!, discreteParameter],
        }),
      ),
    ).toMatchObject({ok: true})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parameters: [
            {...discreteParameter, options: [...options, {label: '중복', value: 1}]},
            ...document.parameters!,
          ],
        }),
      ),
    ).toMatchObject({ok: false})
    expect(
      parseDocument(
        JSON.stringify({
          ...document,
          parameters: [{...discreteParameter, defaultValue: 0.5}, ...document.parameters!],
        }),
      ),
    ).toMatchObject({ok: false})
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

    const result = parseDocument(JSON.stringify(untaggedDocument))

    expect(result).toMatchObject({ok: true})
    if (result.ok) {
      expect(result.document.motions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tracks: expect.arrayContaining([expect.objectContaining({kind: 'parameter'})]),
          }),
        ]),
      )
    }
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
})
