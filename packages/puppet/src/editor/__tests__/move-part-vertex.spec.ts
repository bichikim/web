import {describe, expect, it} from 'vitest'
import {validateMesh} from '../../mesh'
import {createDemoDocument} from '../../player/create-demo-document'
import type {PuppetDocument} from '../../player/document'
import {sampleMotionVertices} from '../../player/internal/motion'
import {parseDocument} from '../../player/parse-document'
import {serializeDocument} from '../../player/serialize-document'
import {movePartVertex} from '../move-part-vertex'

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
          kind: 'vertex',
          partId: PART_ID,
          vertexIndex: CENTER_VERTEX_INDEX,
        },
      ],
    },
  ],
})

describe('movePartVertex', () => {
  it('should translate both axes in every motion and preserve playback after export', () => {
    const source = createAnimatedDocument()
    const motion = source.motions[0]!
    const track = motion.tracks[0]!
    if (track.kind !== 'vertex') {
      throw new Error('Expected a vertex motion fixture')
    }
    const document: PuppetDocument = {
      ...source,
      motions: [
        motion,
        {
          ...motion,
          id: 'second-motion',
          tracks: [
            {
              ...track,
              axis: 'y',
              keyframes: [
                {easing: 'ease-in', time: 0, value: 240},
                {time: 1, value: 200},
              ],
              kind: 'vertex',
              partId: PART_ID,
              vertexIndex: 4,
            },
            {...track, kind: 'vertex', partId: PART_ID, vertexIndex: 0},
            {...track, kind: 'vertex', partId: 'other-part', vertexIndex: 4},
            {keyframes: [{time: 0, value: 0}], kind: 'parameter', parameterId: 'angle-y'},
          ],
        },
      ],
      parts: [...source.parts, {...source.parts[0]!, id: 'other-part'}],
      scene: undefined,
    }
    const snapshot = structuredClone(document)
    const result = movePartVertex({document, partId: PART_ID, vertexIndex: 4, x: 310, y: 260})
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    expect(result.document.motions[0]?.tracks[0]?.keyframes).toEqual([
      {time: 0, value: 310},
      {time: 1, value: 350},
    ])
    expect(result.document.motions[1]?.tracks[0]?.keyframes).toEqual([
      {easing: 'ease-in', time: 0, value: 260},
      {time: 1, value: 220},
    ])
    expect(result.document.motions[1]?.tracks.slice(1)).toEqual(
      document.motions[1]?.tracks.slice(1),
    )
    expect(document).toEqual(snapshot)
    const parsed = parseDocument(serializeDocument(result.document))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error('Expected an exported document to remain valid')
    }
    for (const [index, motion] of document.motions.entries()) {
      for (const time of [0, 0.5, 1]) {
        const before = sampleMotionVertices({
          motion,
          partId: PART_ID,
          restVertices: document.parts[0]!.mesh.vertices,
          time,
        })
        const after = sampleMotionVertices({
          motion: parsed.document.motions[index],
          partId: PART_ID,
          restVertices: parsed.document.parts[0]!.mesh.vertices,
          time,
        })
        expect(after[8]).toBe(before[8]! - 10)
        expect(after[9]).toBe(before[9]! + 20)
        expect(after.slice(0, 8)).toEqual(before.slice(0, 8))
      }
    }
  })

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
