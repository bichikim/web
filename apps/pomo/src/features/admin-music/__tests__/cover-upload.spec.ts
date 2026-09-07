/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  MAXIMUM_COVER_BYTES,
  MAXIMUM_PREPARED_COVER_BYTES,
  uploadAlbumCover,
  validateAlbumCover,
} from '../cover-upload'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('validateAlbumCover', () => {
  it('should reject unsupported image formats', () => {
    const file = new File(['cover'], 'cover.svg', {type: 'image/svg+xml'})

    expect(() => validateAlbumCover(file)).toThrow('JPG, PNG 또는 WebP')
  })

  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'should accept a nonempty %s cover within the upload limit',
    (type) => {
      expect(() => validateAlbumCover(new File(['cover'], 'cover', {type}))).not.toThrow()
    },
  )

  it.each([0, MAXIMUM_COVER_BYTES + 1])('should reject a cover with size %s', (size) => {
    const file = new File([new Uint8Array(size)], 'cover.webp', {type: 'image/webp'})

    expect(() => validateAlbumCover(file)).toThrow('커버 이미지는 10MB 이하여야 합니다.')
  })
})

describe('uploadAlbumCover', () => {
  it('should send the prepared WebP through the authenticated server upload', async () => {
    const file = new File(['cover'], 'cover.webp', {type: 'image/webp'})
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        coverImageUrl: 'https://storage.pomofi.io/album-covers/id/cover.webp',
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    const result = await uploadAlbumCover(file, '019d1990-1dc9-7255-a7b5-f9459dfaf782')

    expect(result).toEqual({
      coverImageUrl: 'https://storage.pomofi.io/album-covers/id/cover.webp',
      coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
    })
    expect(fetcher).toHaveBeenCalledWith(
      '/api/admin/music/covers',
      expect.objectContaining({
        body: file,
        headers: {
          'Content-Type': 'image/webp',
          'X-Pomo-Cover-Id': '019d1990-1dc9-7255-a7b5-f9459dfaf782',
        },
        method: 'POST',
      }),
    )
  })

  it.each([
    ['wrong type', new File(['cover'], 'cover.png', {type: 'image/png'})],
    ['empty', new File([], 'cover.webp', {type: 'image/webp'})],
    [
      'oversized',
      new File([new Uint8Array(MAXIMUM_PREPARED_COVER_BYTES + 1)], 'cover.webp', {
        type: 'image/webp',
      }),
    ],
  ])('should reject a %s prepared cover before upload', async (_label, file) => {
    await expect(uploadAlbumCover(file, 'draft-id')).rejects.toThrow(
      '준비된 커버 이미지는 4MB 이하 WebP여야 합니다.',
    )
  })

  it('should require a cover draft identifier', async () => {
    const file = new File(['cover'], 'cover.webp', {type: 'image/webp'})

    await expect(uploadAlbumCover(file, null)).rejects.toThrow('커버 이미지 초안 ID가 없습니다.')
  })

  it('should report an unsuccessful server upload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))
    const file = new File(['cover'], 'cover.webp', {type: 'image/webp'})

    await expect(uploadAlbumCover(file, 'draft-id')).rejects.toThrow(
      '커버 이미지를 R2에 업로드하지 못했습니다.',
    )
  })

  it('should reject an invalid upload response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          coverImageUrl: 'invalid',
          coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
        }),
      ),
    )
    const file = new File(['cover'], 'cover.webp', {type: 'image/webp'})

    await expect(uploadAlbumCover(file, 'draft-id')).rejects.toBeDefined()
  })
})
