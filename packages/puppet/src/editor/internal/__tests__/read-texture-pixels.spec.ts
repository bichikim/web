/** @vitest-environment jsdom */

import {afterEach, describe, expect, test, vi} from 'vitest'

import {readTexturePixels} from '../read-texture-pixels'

const texture = {height: 2, src: 'data:image/png;base64,texture', width: 2}

class DecodedImage {
  crossOrigin: string | null = null
  decoding = 'auto'
  src = ''

  decode() {
    return Promise.resolve()
  }
}

const createCanvas = () => {
  const pixels = {data: new Uint8ClampedArray(16), height: 2, width: 2}
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => pixels),
  }
  const canvas = {getContext: vi.fn(() => context), height: 0, width: 0}

  return {canvas, context, pixels}
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('readTexturePixels', () => {
  test('should decode and rasterize the declared texture dimensions', async () => {
    const onConstruct = vi.fn()
    class ImageConstructor extends DecodedImage {
      constructor() {
        super()
        onConstruct()
      }
    }
    const {canvas, context, pixels} = createCanvas()
    vi.stubGlobal('Image', ImageConstructor)
    vi.spyOn(window.document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement)

    await expect(readTexturePixels({texture})).resolves.toEqual({ok: true, pixels})
    const image = context.drawImage.mock.calls[0]?.[0]
    expect(onConstruct).toHaveBeenCalledOnce()
    expect(image).toMatchObject({
      crossOrigin: 'anonymous',
      decoding: 'async',
      src: texture.src,
    })
    expect(canvas).toMatchObject({height: 2, width: 2})
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 2, 2)
    expect(context.getImageData).toHaveBeenCalledWith(0, 0, 2, 2)
  })

  test('should reject oversized textures before decoding', async () => {
    const onConstruct = vi.fn()
    class ImageConstructor extends DecodedImage {
      constructor() {
        super()
        onConstruct()
      }
    }
    vi.stubGlobal('Image', ImageConstructor)

    await expect(
      readTexturePixels({texture: {...texture, height: 4097, width: 4097}}),
    ).resolves.toEqual({error: {code: 'too-large'}, ok: false})
    expect(onConstruct).not.toHaveBeenCalled()
  })

  test('should translate image decoding failures', async () => {
    vi.stubGlobal(
      'Image',
      class extends DecodedImage {
        override decode() {
          return Promise.reject(new Error('decode failed'))
        }
      },
    )

    await expect(readTexturePixels({texture})).resolves.toEqual({
      error: {code: 'decode-failed'},
      ok: false,
    })
  })

  test('should translate unavailable and unreadable canvas contexts', async () => {
    vi.stubGlobal('Image', DecodedImage)
    vi.spyOn(window.document, 'createElement').mockReturnValue({
      getContext: () => null,
      height: 0,
      width: 0,
    } as unknown as HTMLElement)

    await expect(readTexturePixels({texture})).resolves.toEqual({
      error: {code: 'render-failed'},
      ok: false,
    })

    vi.restoreAllMocks()
    const {canvas, context} = createCanvas()
    context.getImageData.mockImplementation(() => {
      throw new DOMException('The canvas is tainted.')
    })
    vi.stubGlobal('Image', DecodedImage)
    vi.spyOn(window.document, 'createElement').mockReturnValue(canvas as unknown as HTMLElement)

    await expect(readTexturePixels({texture})).resolves.toEqual({
      error: {code: 'render-failed'},
      ok: false,
    })
  })
})
