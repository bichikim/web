/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, parseDocument, serializeDocument} from '../../player'
import {autoMeshPart, getMinimumAutoMeshCellSize} from '../auto-mesh-part'

const createCanvas = (data: Uint8ClampedArray) => {
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({data, height: 2, width: 2})),
  }

  return {
    canvas: {getContext: vi.fn(() => context), height: 0, width: 0},
    context,
  }
}

const createTwoPixelDocument = () => {
  const document = createDemoDocument()

  return {
    ...document,
    parts: document.parts.map((part, index) =>
      index === 0 ? {...part, texture: {...part.texture, height: 2, width: 2}} : part,
    ),
  }
}

class DecodedImage {
  decoding = 'auto'
  src = ''

  decode() {
    return Promise.resolve()
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('autoMeshPart', () => {
  test('should replace the selected mesh and reset only its stored deformations', async () => {
    const document = createTwoPixelDocument()
    const pixels = new Uint8ClampedArray(2 * 2 * 4)

    for (let index = 3; index < pixels.length; index += 4) {
      pixels[index] = 255
    }

    const {canvas, context} = createCanvas(pixels)
    vi.stubGlobal('Image', DecodedImage)
    vi.spyOn(window.document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement)

    const result = await autoMeshPart({
      document,
      partId: 'mesh-preview',
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

    expect(context.drawImage).toHaveBeenCalledOnce()
  })

  test('should report missing parts, texture decode failures, and unavailable canvas rendering', async () => {
    const document = createTwoPixelDocument()

    await expect(
      autoMeshPart({
        document,
        partId: 'missing',
        settings: {alphaThreshold: 16, cellSize: 4},
      }),
    ).resolves.toEqual({error: {code: 'part-not-found'}, ok: false})

    vi.stubGlobal(
      'Image',
      class extends DecodedImage {
        override decode() {
          return Promise.reject(new Error('decode failed'))
        }
      },
    )
    await expect(
      autoMeshPart({
        document,
        partId: 'mesh-preview',
        settings: {alphaThreshold: 16, cellSize: 4},
      }),
    ).resolves.toEqual({error: {code: 'decode-failed'}, ok: false})

    vi.stubGlobal('Image', DecodedImage)
    vi.spyOn(window.document, 'createElement').mockReturnValue({
      getContext: () => null,
      height: 0,
      width: 0,
    } as unknown as HTMLElement)
    await expect(
      autoMeshPart({
        document,
        partId: 'mesh-preview',
        settings: {alphaThreshold: 16, cellSize: 4},
      }),
    ).resolves.toEqual({error: {code: 'render-failed'}, ok: false})
  })

  test('should return the mesh generator failure for a transparent texture', async () => {
    const document = createTwoPixelDocument()
    const {canvas} = createCanvas(new Uint8ClampedArray(2 * 2 * 4))
    vi.stubGlobal('Image', DecodedImage)
    vi.spyOn(window.document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement)

    await expect(
      autoMeshPart({
        document,
        partId: 'mesh-preview',
        settings: {alphaThreshold: 16, cellSize: 1},
      }),
    ).resolves.toEqual({error: {code: 'no-opaque-pixels'}, ok: false})
  })

  test('should report a texture that the canvas cannot read', async () => {
    const document = createTwoPixelDocument()
    const {canvas, context} = createCanvas(new Uint8ClampedArray(2 * 2 * 4))
    context.getImageData.mockImplementation(() => {
      throw new DOMException('The canvas is tainted.')
    })
    vi.stubGlobal('Image', DecodedImage)
    vi.spyOn(window.document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement)

    await expect(
      autoMeshPart({
        document,
        partId: 'mesh-preview',
        settings: {alphaThreshold: 16, cellSize: 1},
      }),
    ).resolves.toEqual({error: {code: 'render-failed'}, ok: false})
  })

  test('should reject a density that can exceed the automatic mesh cell budget', async () => {
    const document = createDemoDocument()

    expect(getMinimumAutoMeshCellSize(640, 480)).toBe(3)
    await expect(
      autoMeshPart({
        document,
        partId: 'mesh-preview',
        settings: {alphaThreshold: 16, cellSize: 1},
      }),
    ).resolves.toEqual({error: {code: 'invalid-cell-size'}, ok: false})
  })

  test('should reject texture dimensions that exceed the supported pixel budget', async () => {
    const document = createDemoDocument()
    const oversizedDocument = {
      ...document,
      parts: document.parts.map((part, index) =>
        index === 0 ? {...part, texture: {...part.texture, height: 4097, width: 4097}} : part,
      ),
    }

    await expect(
      autoMeshPart({
        document: oversizedDocument,
        partId: 'mesh-preview',
        settings: {alphaThreshold: 16, cellSize: 32},
      }),
    ).resolves.toEqual({error: {code: 'too-large'}, ok: false})
  })
})
