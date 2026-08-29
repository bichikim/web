import {afterEach, describe, expect, it, vi} from 'vitest'

import {deleteTrackArtwork, storeAlbumCover, storeTrackArtwork} from '../cover-upload'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('storeAlbumCover', () => {
  it('should upload through a signed server request and return an immutable public URL', async () => {
    const signRequest = vi.fn(async (request: Request) => {
      const headers = new Headers(request.headers)
      headers.set('Authorization', 'signed')
      return new Request(request, {headers})
    })
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 200}))
    const body = new TextEncoder().encode('webp').buffer
    const result = await storeAlbumCover(
      {body, contentType: 'image/webp'},
      {
        environment: {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'},
        fetcher,
        id: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
        signRequest,
      },
    )
    const signedRequest = signRequest.mock.calls[0]?.[0]

    expect(result).toEqual({
      coverImageUrl:
        'https://storage.pomofi.io/album-covers/019d1990-1dc9-7255-a7b5-f9459dfaf782/cover.webp',
    })
    expect(signedRequest?.method).toBe('PUT')
    expect(signedRequest?.headers.get('Content-Type')).toBe('image/webp')
    expect(signedRequest?.url).toContain('/pomofi-audio/album-covers/')
    expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({method: 'PUT'}))
  })

  it('should require the R2 account ID before signing', () =>
    expect(
      storeAlbumCover(
        {body: new ArrayBuffer(1), contentType: 'image/png'},
        {environment: {}, signRequest: vi.fn()},
      ),
    ).rejects.toThrow('CLOUDFLARE_R2_ACCOUNT_ID'))

  it('should reject an unsuccessful album cover upload', () =>
    expect(
      storeAlbumCover(
        {body: new ArrayBuffer(1), contentType: 'image/png'},
        {
          environment: {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'},
          fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 500})),
          signRequest: async (request) => request,
        },
      ),
    ).rejects.toThrow('R2 cover upload failed with status 500'))
})

describe('storeTrackArtwork', () => {
  it('should store immutable extracted artwork at an asset-specific public URL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 200}))
    const result = await storeTrackArtwork(
      '019d1990-1dc9-7255-a7b5-f9459dfaf782',
      {body: new ArrayBuffer(1), contentType: 'image/jpeg'},
      {
        environment: {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'},
        fetcher,
        signRequest: async (request) => request,
      },
    )
    const request = fetcher.mock.calls[0]?.[0]

    expect(result).toEqual({
      artworkUrl:
        'https://storage.pomofi.io/track-artwork/019d1990-1dc9-7255-a7b5-f9459dfaf782/cover',
    })
    expect(request).toBeInstanceOf(Request)
    expect(request instanceof Request && request.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    )
    expect(request instanceof Request && request.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('should delete extracted artwork idempotently', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 404}))

    await expect(
      deleteTrackArtwork('019d1990-1dc9-7255-a7b5-f9459dfaf782', {
        environment: {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'},
        fetcher,
        signRequest: async (request) => request,
      }),
    ).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({method: 'DELETE'}))
  })

  it('should reject an unsuccessful track artwork upload', () =>
    expect(
      storeTrackArtwork(
        '019d1990-1dc9-7255-a7b5-f9459dfaf782',
        {body: new ArrayBuffer(1), contentType: 'image/jpeg'},
        {
          environment: {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'},
          fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 502})),
          signRequest: async (request) => request,
        },
      ),
    ).rejects.toThrow('R2 track artwork upload failed with status 502'))

  it('should reject a failed artwork deletion other than not found', () =>
    expect(
      deleteTrackArtwork('019d1990-1dc9-7255-a7b5-f9459dfaf782', {
        environment: {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'},
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 503})),
        signRequest: async (request) => request,
      }),
    ).rejects.toThrow('R2 track artwork delete failed with status 503'))

  it('should use the runtime environment, AWS signer, and global fetch defaults', async () => {
    vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', ' account-id ')
    vi.stubEnv('POMO_PUBLIC_ASSETS_ORIGIN', ' https://cdn.example/ ')
    vi.stubEnv('POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID', ' access-key ')
    vi.stubEnv('POMO_PUBLIC_ASSETS_R2_BUCKET', ' custom-bucket ')
    vi.stubEnv('POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY', ' secret-key ')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 200}))
    vi.stubGlobal('fetch', fetcher)

    const album = await storeAlbumCover({body: new ArrayBuffer(1), contentType: 'image/png'})
    const track = await storeTrackArtwork('019d1990-1dc9-7255-a7b5-f9459dfaf782', {
      body: new ArrayBuffer(1),
      contentType: 'image/webp',
    })
    await deleteTrackArtwork('019d1990-1dc9-7255-a7b5-f9459dfaf782')

    expect(album.coverImageUrl).toMatch(
      /^https:\/\/cdn\.example\/album-covers\/[0-9a-f-]+\/cover\.png$/u,
    )
    expect(track).toEqual({
      artworkUrl: 'https://cdn.example/track-artwork/019d1990-1dc9-7255-a7b5-f9459dfaf782/cover',
    })
    expect(fetcher).toHaveBeenCalledTimes(3)
    for (const [request] of fetcher.mock.calls) {
      expect(request).toBeInstanceOf(Request)
      expect(request instanceof Request && request.url).toContain('/custom-bucket/')
      expect(request instanceof Request && request.headers.has('Authorization')).toBe(true)
    }
  })
})
