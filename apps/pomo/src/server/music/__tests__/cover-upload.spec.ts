import {describe, expect, it, vi} from 'vitest'

import {storeAlbumCover} from '../cover-upload'

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
})
