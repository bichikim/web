/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {uploadAlbumCover, validateAlbumCover} from '../cover-upload'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('validateAlbumCover', () => {
  it('should reject unsupported image formats', () => {
    const file = new File(['cover'], 'cover.svg', {type: 'image/svg+xml'})

    expect(() => validateAlbumCover(file)).toThrow('JPG, PNG 또는 WebP')
  })
})

describe('uploadAlbumCover', () => {
  it('should send the prepared WebP through the authenticated server upload', async () => {
    const file = new File(['cover'], 'cover.webp', {type: 'image/webp'})
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        coverImageUrl: 'https://storage.pomofi.io/album-covers/id/cover.webp',
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    const coverImageUrl = await uploadAlbumCover(file, '019d1990-1dc9-7255-a7b5-f9459dfaf782')

    expect(coverImageUrl).toBe('https://storage.pomofi.io/album-covers/id/cover.webp')
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
})
