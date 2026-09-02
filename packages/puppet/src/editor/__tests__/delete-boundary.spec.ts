import {describe, expect, it} from 'vitest'

import {getMeshVertex, type MeshPoint, validateMesh} from '../../mesh'
import {createDemoDocument} from '../../player/create-demo-document'
import type {PuppetDocument, PuppetMesh} from '../../player/document'
import {addPartVertex, deletePartVertex} from '../edit-document'

const PART_ID = 'mesh-preview'

const createFanMesh = (boundary: ReadonlyArray<MeshPoint>): PuppetMesh => {
  const minimumX = Math.min(...boundary.map((point) => point.x))
  const maximumX = Math.max(...boundary.map((point) => point.x))
  const minimumY = Math.min(...boundary.map((point) => point.y))
  const maximumY = Math.max(...boundary.map((point) => point.y))
  const points = [...boundary, {x: 0, y: 0}]
  const centerIndex = boundary.length

  return {
    boundaryLoops: [boundary.map((_, index) => index)],
    indices: boundary.flatMap((_, index) => [index, (index + 1) % boundary.length, centerIndex]),
    uvs: points.flatMap((point) => [
      (point.x - minimumX) / (maximumX - minimumX),
      (point.y - minimumY) / (maximumY - minimumY),
    ]),
    vertices: points.flatMap((point) => [point.x, point.y]),
  }
}

const createRadialPoints = (sides: number, horizontalRadius: number, verticalRadius: number) =>
  Array.from({length: sides}, (_, index) => {
    const angle = (index / sides) * Math.PI * 2
    return {x: Math.cos(angle) * horizontalRadius, y: Math.sin(angle) * verticalRadius}
  })

const replaceMesh = (mesh: PuppetMesh): PuppetDocument => {
  const document = createDemoDocument()
  return {
    ...document,
    motions: [],
    parts: document.parts.map((part) => (part.id === PART_ID ? {...part, mesh} : part)),
  }
}

describe('deletePartVertex boundary reconstruction', () => {
  it('should preserve an existing concave outline when deleting one boundary vertex', () => {
    const boundary = Array.from({length: 12}, (_, index) => {
      const angle = (index / 12) * Math.PI * 2
      const radius = index % 2 === 0 ? 300 : 120
      return {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius}
    })
    const document = replaceMesh(createFanMesh(boundary))
    const result = deletePartVertex({document, partId: PART_ID, vertexIndex: 0})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      const boundaryIndices = new Set(mesh.boundaryLoops?.[0])

      for (const expectedPoint of boundary.slice(1)) {
        const resultIndex = Array.from(
          {length: mesh.vertices.length / 2},
          (_, index) => index,
        ).find((index) => {
          const point = getMeshVertex(mesh, index)
          return point?.x === expectedPoint.x && point.y === expectedPoint.y
        })

        expect(resultIndex).toBeDefined()
        expect(boundaryIndices.has(resultIndex ?? -1)).toBe(true)
      }
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should remove a point added inside a polygon with collinear neighbors', () => {
    const document = replaceMesh(createFanMesh(createRadialPoints(4, 300, 220)))
    const added = addPartVertex({document, partId: PART_ID, x: -90, y: 44})

    expect(added.ok).toBe(true)

    if (!added.ok || added.vertexIndex === undefined) {
      return
    }

    const result = deletePartVertex({
      document: added.document,
      partId: PART_ID,
      vertexIndex: added.vertexIndex,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(validateMesh(result.document.parts[0]!.mesh)).toEqual({valid: true})
    }
  })

  it('should remove a point added to a slender outline edge', () => {
    const boundary = createRadialPoints(16, 600, 20)
    const document = replaceMesh(createFanMesh(boundary))
    const first = boundary[4]!
    const second = boundary[5]!
    const added = addPartVertex({
      document,
      partId: PART_ID,
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    })

    expect(added.ok).toBe(true)

    if (!added.ok || added.vertexIndex === undefined) {
      return
    }

    const result = deletePartVertex({
      document: added.document,
      partId: PART_ID,
      vertexIndex: added.vertexIndex,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(validateMesh(result.document.parts[0]!.mesh)).toEqual({valid: true})
    }
  })

  it('should finish a slender boundary deletion sequence without a degenerate triangle', () => {
    const document = replaceMesh({
      boundaryLoops: [[1, 2, 3, 4, 5, 0]],
      indices: [1, 2, 3, 1, 3, 4, 1, 4, 5, 5, 0, 1],
      uvs: [
        0.691_341_716_182_545, 0.038_060_233_744_356_7, 0.308_658_283_817_455_14,
        0.961_939_766_255_643_4, 0, 0.500_000_000_000_000_1, 0.146_446_609_406_726_19,
        0.146_446_609_406_726_27, 0.499_999_999_999_999_9, 0, 0.5, 0.5,
      ],
      vertices: [
        229.610_059_419_053_9, 18.477_590_650_225_736, -554.327_719_506_772, 7.653_668_647_301_798,
        -554.327_719_506_772_2, -7.653_668_647_301_792, -424.264_068_711_928_6,
        -14.142_135_623_730_95, -229.610_059_419_054_2, -18.477_590_650_225_73, 0, 0,
      ],
    })
    const result = deletePartVertex({document, partId: PART_ID, vertexIndex: 2})

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(validateMesh(result.document.parts[0]!.mesh)).toEqual({valid: true})
    }
  })

  it('should move a replacement vertex to preserve a circular outline', () => {
    const document = createDemoDocument()
    const circle = document.parts.find((part) => part.id === 'shape-circle')!
    const animated: PuppetDocument = {
      ...document,
      motions: [
        {
          duration: 1,
          id: 'circle-motion',
          tracks: [
            {
              axis: 'x',
              keyframes: [
                {time: 0, value: 0},
                {time: 1, value: 12},
              ],
              kind: 'vertex',
              partId: circle.id,
              vertexIndex: 0,
            },
          ],
        },
      ],
    }
    const result = deletePartVertex({document: animated, partId: circle.id, vertexIndex: 0})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts.find((part) => part.id === circle.id)!.mesh
      const promotedIndex = Array.from({length: mesh.uvs.length / 2}, (_, index) => index).find(
        (index) => mesh.uvs[index * 2] === 1 && mesh.uvs[index * 2 + 1] === 0.5,
      )

      expect(mesh.boundaryLoops?.[0]).toHaveLength(12)
      expect(promotedIndex).toBeDefined()
      expect(getMeshVertex(mesh, promotedIndex ?? -1)).toEqual({x: 222, y: 140})
      expect(result.document.motions[0]?.tracks[0]).toMatchObject({vertexIndex: promotedIndex})
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should move an interior replacement when needed to preserve the outline', () => {
    const document = replaceMesh({
      boundaryLoops: [[0, 1, 2, 3]],
      indices: [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4],
      uvs: [0, 0, 1, 0, 1, 1, 0, 1, 0.625, 0.625],
      vertices: [0, 0, 640, 0, 640, 480, 0, 480, 400, 300],
    })
    const result = deletePartVertex({document, partId: PART_ID, vertexIndex: 0})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh

      expect(mesh.vertices).toEqual([640, 0, 640, 480, 0, 480, 0, 0])
      expect(mesh.uvs.slice(-2)).toEqual([0, 0])
      expect(mesh.boundaryLoops?.[0]).toHaveLength(4)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should delete a corner without a replacement when five boundary vertices remain', () => {
    const document = replaceMesh({
      indices: [0, 1, 2, 0, 2, 3, 0, 3, 4],
      uvs: [0, 0, 0.8, 0, 1, 0.5, 0.8, 1, 0, 1],
      vertices: [0, 0, 640, 0, 700, 240, 640, 480, 0, 480],
    })
    const result = deletePartVertex({document, partId: PART_ID, vertexIndex: 2})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      expect(mesh.vertices).toHaveLength(8)
      expect(mesh.boundaryLoops).toHaveLength(1)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should keep the affected mesh in one connected boundary', () => {
    const document = replaceMesh({
      boundaryLoops: [[0, 1, 2, 3, 5, 4]],
      indices: [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 5, 4],
      uvs: [0, 0, 1, 0, 1, 1, 0, 1, 0.5, 0.5, 0, 0.77747],
      vertices: [
        0, 0, 640, 0, 640, 480, 23.4001506524, 526.3323015965, 320, 240, -8.2884364652,
        389.4354267134,
      ],
    })
    const result = deletePartVertex({document, partId: PART_ID, vertexIndex: 2})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      expect(mesh.boundaryLoops).toHaveLength(1)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should not join disconnected texture regions while rebuilding a corner', () => {
    const document = replaceMesh({
      boundaryLoops: [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
      ],
      indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7],
      uvs: [0, 0, 1 / 3, 0, 1 / 3, 1, 0, 1, 2 / 3, 0, 1, 0, 1, 1, 2 / 3, 1],
      vertices: [0, 0, 1, 0, 1, 1, 0, 1, 2, 0, 3, 0, 3, 1, 2, 1],
    })
    const added = addPartVertex({document, partId: PART_ID, x: 0.5, y: 0})

    expect(added.ok).toBe(true)

    if (!added.ok) {
      return
    }

    const result = deletePartVertex({document: added.document, partId: PART_ID, vertexIndex: 0})

    expect(result.ok).toBe(true)

    if (result.ok) {
      const mesh = result.document.parts[0]!.mesh
      expect(mesh.boundaryLoops).toHaveLength(2)
      expect(validateMesh(mesh)).toEqual({valid: true})
    }
  })

  it('should reject an unsupported inner boundary instead of filling it', () => {
    const document = replaceMesh({
      boundaryLoops: [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
      ],
      indices: [0, 1, 7, 0, 7, 4, 1, 2, 6, 1, 6, 7, 2, 3, 5, 2, 5, 6, 3, 0, 4, 3, 4, 5],
      uvs: [0, 0, 1, 0, 1, 1, 0, 1, 0.25, 0.25, 0.25, 0.75, 0.75, 0.75, 0.75, 0.25],
      vertices: [0, 0, 640, 0, 640, 480, 0, 480, 160, 120, 160, 360, 480, 360, 480, 120],
    })
    const result = deletePartVertex({document, partId: PART_ID, vertexIndex: 0})

    expect(result).toEqual({error: {code: 'invalid-mesh'}, ok: false})
  })

  it('should transfer deleted-corner motion to the promoted boundary vertex', () => {
    const document = createDemoDocument()
    const added = addPartVertex({document, partId: PART_ID, x: 160, y: 0})

    expect(added.ok).toBe(true)

    if (!added.ok) {
      return
    }

    const animated: PuppetDocument = {
      ...added.document,
      motions: [
        {
          duration: 1,
          id: 'corner-motion',
          tracks: [
            {
              axis: 'x',
              keyframes: [
                {time: 0, value: 0},
                {time: 1, value: 20},
              ],
              kind: 'vertex',
              partId: PART_ID,
              vertexIndex: 0,
            },
            {
              axis: 'y',
              keyframes: [
                {time: 0, value: 0},
                {time: 1, value: 10},
              ],
              kind: 'vertex',
              partId: PART_ID,
              vertexIndex: 5,
            },
          ],
        },
      ],
    }
    const result = deletePartVertex({document: animated, partId: PART_ID, vertexIndex: 0})

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.motions[0]?.tracks[0]).toMatchObject({vertexIndex: 4})
      expect(result.document.motions[0]?.tracks[0]?.keyframes).toEqual([
        {time: 0, value: 0},
        {time: 1, value: 20},
      ])
      expect(result.document.motions[0]?.tracks[1]).toMatchObject({axis: 'y', vertexIndex: 4})
    }
  })

  it('should translate an existing promoted-vertex motion to its new corner position', () => {
    const document = createDemoDocument()
    const added = addPartVertex({document, partId: PART_ID, x: 160, y: 0})

    expect(added.ok).toBe(true)
    if (!added.ok || added.vertexIndex === undefined) {
      return
    }

    const animated: PuppetDocument = {
      ...added.document,
      motions: [
        {
          duration: 1,
          id: 'promoted-motion',
          tracks: [
            {
              axis: 'x',
              keyframes: [
                {time: 0, value: 160},
                {time: 1, value: 200},
              ],
              kind: 'vertex',
              partId: PART_ID,
              vertexIndex: added.vertexIndex,
            },
          ],
        },
      ],
    }
    const result = deletePartVertex({document: animated, partId: PART_ID, vertexIndex: 0})

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.document.motions[0]?.tracks[0]).toMatchObject({
        keyframes: [
          {time: 0, value: 0},
          {time: 1, value: 40},
        ],
        vertexIndex: 4,
      })
    }
  })
})
