/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  COVER_IMAGE_EDGE,
  COVER_IMAGE_QUALITY,
  COVER_IMAGE_TYPE,
  prepareAlbumCover,
} from '../cover-image'

describe('prepareAlbumCover', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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
