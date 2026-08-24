/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {
  COVER_IMAGE_EDGE,
  COVER_IMAGE_QUALITY,
  COVER_IMAGE_TYPE,
  prepareAlbumCover,
} from '../cover-image'

describe('prepareAlbumCover', () => {
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
})
