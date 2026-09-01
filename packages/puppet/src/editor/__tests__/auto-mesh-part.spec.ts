import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocument, serializeDocument} from '../../player'
import {autoMeshPart, getMinimumAutoMeshCellSize} from '../auto-mesh-part'

const createTwoPixelDocument = () => {
  const document = createDemoDocument()

  return {
    ...document,
    parts: document.parts.map((part, index) =>
      index === 0 ? {...part, texture: {...part.texture, height: 2, width: 2}} : part,
    ),
  }
}

const createPixels = (opaque = true) => {
  const data = new Uint8ClampedArray(2 * 2 * 4)

  if (opaque) {
    for (let index = 3; index < data.length; index += 4) {
      data[index] = 255
    }
  }

  return {data, height: 2, width: 2}
}

describe('autoMeshPart', () => {
  test('should replace the selected mesh and reset only its stored deformations', () => {
    const document = createTwoPixelDocument()

    const result = autoMeshPart({
      document,
      partId: 'mesh-preview',
      pixels: createPixels(),
      settings: {alphaThreshold: 16, cellSize: 1},
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.document.parts[0]?.mesh.vertices).toHaveLength(18)
      expect(result.document.parts[0]?.mesh.vertices.slice(0, 4)).toEqual([0, 0, 1, 0])
      expect(result.document.parts[0]?.mesh.vertices.slice(-2)).toEqual([2, 2])
      expect(result.document.motions[0]?.tracks).toEqual([])
      expect(
        result.document.parameters?.flatMap((parameter) =>
          parameter.keyforms.flatMap((keyform) => keyform.parts),
        ),
      ).toContainEqual(
        expect.objectContaining({
          partId: 'mesh-preview',
          vertices: result.document.parts[0]?.mesh.vertices,
        }),
      )
      expect(result.document.parts[1]).toBe(document.parts[1])
      expect(parseDocument(serializeDocument(result.document))).toEqual({
        document: result.document,
        ok: true,
      })
    }
  })

  test('should report a missing part', () => {
    const document = createTwoPixelDocument()

    expect(
      autoMeshPart({
        document,
        partId: 'missing',
        pixels: createPixels(),
        settings: {alphaThreshold: 16, cellSize: 4},
      }),
    ).toEqual({error: {code: 'part-not-found'}, ok: false})
  })

  test('should return the mesh generator failure for transparent pixels', () => {
    const document = createTwoPixelDocument()

    expect(
      autoMeshPart({
        document,
        partId: 'mesh-preview',
        pixels: createPixels(false),
        settings: {alphaThreshold: 16, cellSize: 1},
      }),
    ).toEqual({error: {code: 'no-opaque-pixels'}, ok: false})
  })

  test('should reject pixels that do not match the selected texture dimensions', () => {
    const document = createTwoPixelDocument()

    expect(
      autoMeshPart({
        document,
        partId: 'mesh-preview',
        pixels: {data: new Uint8ClampedArray(4), height: 1, width: 1},
        settings: {alphaThreshold: 16, cellSize: 1},
      }),
    ).toEqual({error: {code: 'invalid-pixel-data'}, ok: false})
  })

  test('should reject a density that can exceed the automatic mesh cell budget', () => {
    const document = createDemoDocument()

    expect(getMinimumAutoMeshCellSize(640, 480)).toBe(3)
    expect(
      autoMeshPart({
        document,
        partId: 'mesh-preview',
        pixels: createPixels(),
        settings: {alphaThreshold: 16, cellSize: 1},
      }),
    ).toEqual({error: {code: 'invalid-cell-size'}, ok: false})
  })

  test('should reject texture dimensions that exceed the supported pixel budget', () => {
    const document = createDemoDocument()
    const oversizedDocument = {
      ...document,
      parts: document.parts.map((part, index) =>
        index === 0 ? {...part, texture: {...part.texture, height: 4097, width: 4097}} : part,
      ),
    }

    expect(
      autoMeshPart({
        document: oversizedDocument,
        partId: 'mesh-preview',
        pixels: createPixels(),
        settings: {alphaThreshold: 16, cellSize: 32},
      }),
    ).toEqual({error: {code: 'too-large'}, ok: false})
  })
})
