/** @vitest-environment jsdom */

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import sharp from 'sharp'

import {
  COVER_IMAGE_EDGE,
  COVER_IMAGE_QUALITY,
  COVER_IMAGE_TYPE,
  prepareAlbumCover,
} from '../cover-image'
import {validateAlbumCover} from '../cover-upload'

const POMO_ROOT = process.cwd().endsWith('/apps/pomo')
  ? process.cwd()
  : resolve(process.cwd(), 'apps/pomo')
const JPEG_FIXTURE = readFileSync(
  resolve(POMO_ROOT, 'src/features/weather/assets/scene/day-clear.jpg'),
)

const readFileContents = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolveContents, rejectContents) => {
    const reader = new FileReader()
    reader.addEventListener(
      'load',
      () => {
        if (reader.result instanceof ArrayBuffer) {
          resolveContents(reader.result)
          return
        }

        rejectContents(new TypeError('The image test file could not be read.'))
      },
      {once: true},
    )
    reader.addEventListener('error', () => rejectContents(reader.error), {once: true})
    reader.readAsArrayBuffer(file)
  })

const createSharpBackedRuntime = () => {
  const close = vi.fn()
  const source = document.createElement('canvas')
  const encode = vi.fn(async () => new Blob(['webp'], {type: COVER_IMAGE_TYPE}))
  const decode = vi.fn(async (file: File) => {
    const decodedImage = await sharp(new Uint8Array(await readFileContents(file)))
      .rotate()
      .raw()
      .toBuffer({resolveWithObject: true})

    return {close, height: decodedImage.info.height, source, width: decodedImage.info.width}
  })

  return {close, decode, encode, source}
}

describe('prepareAlbumCover', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each(['', 'image/jpg'])(
    'should decode a genuine JPEG whose browser MIME type is %j and prepare a square WebP',
    async (type) => {
      const file = new File([JPEG_FIXTURE], 'cover.jpg', {type})
      const runtime = createSharpBackedRuntime()

      expect(() => validateAlbumCover(file)).not.toThrow()

      const preparedFile = await prepareAlbumCover(file, runtime)

      expect(runtime.decode).toHaveBeenCalledExactlyOnceWith(file)
      expect(runtime.encode).toHaveBeenCalledWith(
        expect.objectContaining({targetSize: COVER_IMAGE_EDGE, type: COVER_IMAGE_TYPE}),
      )
      expect(preparedFile.name).toBe('cover.webp')
      expect(preparedFile.type).toBe(COVER_IMAGE_TYPE)
    },
  )

  it('should reject a filename with only a three-byte JPEG signature at the decode boundary', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'cover.jpg', {type: ''})
    const runtime = createSharpBackedRuntime()

    await expect(prepareAlbumCover(file, runtime)).rejects.toBeDefined()

    expect(runtime.decode).toHaveBeenCalledExactlyOnceWith(file)
    expect(runtime.encode).not.toHaveBeenCalled()
  })

  it('should center-crop a landscape image and encode a square WebP cover', async () => {
    const close = vi.fn()
    const encode = vi.fn(async () => new Blob(['webp'], {type: COVER_IMAGE_TYPE}))
    const source = document.createElement('canvas')
    const file = new File(['jpeg'], 'wide.jpg', {type: 'image/jpeg'})

    const preparedFile = await prepareAlbumCover(file, {
      decode: vi.fn(async () => ({close, height: 1600, source, width: 2400})),
      encode,
    })

    expect(encode).toHaveBeenCalledWith({
      quality: COVER_IMAGE_QUALITY,
      source,
      sourceSize: 1600,
      sourceX: 400,
      sourceY: 0,
      targetSize: COVER_IMAGE_EDGE,
      type: COVER_IMAGE_TYPE,
    })
    expect(preparedFile.name).toBe('cover.webp')
    expect(preparedFile.type).toBe(COVER_IMAGE_TYPE)
    expect(close).toHaveBeenCalledOnce()
  })

  it('should reject a browser encoder that falls back from WebP', async () => {
    const close = vi.fn()
    const file = new File(['png'], 'cover.png', {type: 'image/png'})

    await expect(
      prepareAlbumCover(file, {
        decode: vi.fn(async () => ({
          close,
          height: 1200,
          source: document.createElement('canvas'),
          width: 1200,
        })),
        encode: vi.fn(async () => new Blob(['png'], {type: 'image/png'})),
      }),
    ).rejects.toThrow('WebP 커버 변환을 지원하지 않습니다.')
    expect(close).toHaveBeenCalledOnce()
  })

  it('should reject an image without measurable dimensions', async () => {
    const close = vi.fn()
    const file = new File(['png'], 'cover.png', {type: 'image/png'})

    await expect(
      prepareAlbumCover(file, {
        decode: vi.fn(async () => ({
          close,
          height: 0,
          source: document.createElement('canvas'),
          width: 0,
        })),
        encode: vi.fn(),
      }),
    ).rejects.toThrow('크기를 확인할 수 없는 커버 이미지입니다.')
    expect(close).toHaveBeenCalledOnce()
  })

  it('should reject an image with only a missing height', async () => {
    const close = vi.fn()
    const file = new File(['png'], 'cover.png', {type: 'image/png'})

    await expect(
      prepareAlbumCover(file, {
        decode: vi.fn(async () => ({
          close,
          height: 0,
          source: document.createElement('canvas'),
          width: 1200,
        })),
        encode: vi.fn(),
      }),
    ).rejects.toThrow('크기를 확인할 수 없는 커버 이미지입니다.')
    expect(close).toHaveBeenCalledOnce()
  })

  it('should decode, crop, and encode with the browser runtime', async () => {
    const close = vi.fn()
    const bitmap = {close, height: 2400, width: 1600} as ImageBitmap
    const drawImage = vi.fn()
    const blob = new Blob(['webp'], {type: COVER_IMAGE_TYPE})
    const canvas = {
      getContext: vi.fn(() => ({drawImage})),
      height: 0,
      toBlob: vi.fn((callback: BlobCallback) => callback(blob)),
      width: 0,
    } as unknown as HTMLCanvasElement
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    )
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    const prepared = await prepareAlbumCover(
      new File(['jpeg'], 'portrait.jpg', {type: 'image/jpeg'}),
    )

    expect(createImageBitmap).toHaveBeenCalledWith(expect.any(File), {
      imageOrientation: 'from-image',
    })
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 400, 1600, 1600, 0, 0, 1200, 1200)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), COVER_IMAGE_TYPE, 0.85)
    expect(prepared.type).toBe(COVER_IMAGE_TYPE)
    expect(close).toHaveBeenCalledOnce()
  })

  it('should reject when the browser cannot create a 2D canvas context', async () => {
    const close = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({close, height: 1200, width: 1200}) as ImageBitmap),
    )
    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: () => null,
      height: 0,
      width: 0,
    } as unknown as HTMLCanvasElement)

    await expect(
      prepareAlbumCover(new File(['png'], 'cover.png', {type: 'image/png'})),
    ).rejects.toThrow('Canvas를 만들지 못했습니다.')
    expect(close).toHaveBeenCalledOnce()
  })

  it('should reject when the browser WebP encoder returns no blob', async () => {
    const close = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({close, height: 1200, width: 1200}) as ImageBitmap),
    )
    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: () => ({drawImage: vi.fn()}),
      height: 0,
      toBlob: (callback: BlobCallback) => callback(null),
      width: 0,
    } as unknown as HTMLCanvasElement)

    await expect(
      prepareAlbumCover(new File(['png'], 'cover.png', {type: 'image/png'})),
    ).rejects.toThrow('WebP로 변환하지 못했습니다.')
    expect(close).toHaveBeenCalledOnce()
  })
})
