/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({connectAlbumOffer: vi.fn()}))
const paddleMocks = vi.hoisted(() => ({retrievePaddlePrice: vi.fn()}))

vi.mock('src/server/auth/authorize-admin-request', () => authMocks)
vi.mock('src/server/repositories/music-admin', () => repositoryMocks)
vi.mock('src/server/payment/providers/paddle', () => paddleMocks)

import {POST} from '../offers'
import {invokeApiRoute} from '../../../__tests__/invoke'

const ALBUM_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const createRequest = (): Request =>
  new Request('https://www.pomofi.io/api/admin/music/offers', {
    body: JSON.stringify({
      albumId: ALBUM_ID,
      externalProductId: 'pomo.album.first',
      provider: 'apps-in-toss',
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

const createRequestWithBody = (body: string): Request =>
  new Request('https://www.pomofi.io/api/admin/music/offers', {
    body,
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

describe('admin music offer route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({authorized: true, cookies: []})
    repositoryMocks.connectAlbumOffer.mockReset().mockResolvedValue({success: true})
    paddleMocks.retrievePaddlePrice.mockReset().mockResolvedValue({
      active: true,
      amountMinor: 1000n,
      currency: 'USD',
      fractionalDigits: 2,
      id: 'pri_album_first',
      type: 'one_time',
    })
  })

  it('should connect an Apps in Toss one-time product for an administrator', async () => {
    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(200)
    expect(paddleMocks.retrievePaddlePrice).not.toHaveBeenCalled()
    expect(repositoryMocks.connectAlbumOffer).toHaveBeenCalledWith({
      albumId: ALBUM_ID,
      externalProductId: 'pomo.album.first',
      provider: 'apps-in-toss',
    })
  })

  it('should reject a Paddle offer whose configured price differs from the Price API', async () => {
    paddleMocks.retrievePaddlePrice.mockResolvedValueOnce({
      active: true,
      amountMinor: 1200n,
      currency: 'USD',
      fractionalDigits: 2,
      id: 'pri_album_first',
      type: 'one_time',
    })

    const response = await invokeApiRoute(
      POST,
      createRequestWithBody(
        JSON.stringify({
          albumId: ALBUM_ID,
          amountMinor: '1000',
          currency: 'USD',
          externalProductId: 'pri_album_first',
          fractionalDigits: 2,
          provider: 'paddle',
        }),
      ),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({error: 'paddle_price_mismatch'})
    expect(repositoryMocks.connectAlbumOffer).not.toHaveBeenCalled()
  })

  it('should reject an inactive recurring or free Paddle Price', async () => {
    paddleMocks.retrievePaddlePrice.mockResolvedValueOnce({
      active: false,
      amountMinor: null,
      currency: 'USD',
      fractionalDigits: 2,
      id: 'pri_album_first',
      type: 'recurring',
    })

    const response = await invokeApiRoute(
      POST,
      createRequestWithBody(
        JSON.stringify({
          albumId: ALBUM_ID,
          amountMinor: '1000',
          currency: 'USD',
          externalProductId: 'pri_album_first',
          fractionalDigits: 2,
          provider: 'paddle',
        }),
      ),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({error: 'paddle_price_mismatch'})
    expect(repositoryMocks.connectAlbumOffer).not.toHaveBeenCalled()
  })

  it('should reject a Paddle Price with mismatched currency precision', async () => {
    paddleMocks.retrievePaddlePrice.mockResolvedValueOnce({
      active: true,
      amountMinor: 1000n,
      currency: 'JPY',
      fractionalDigits: 0,
      id: 'pri_album_first',
      type: 'one_time',
    })

    const response = await invokeApiRoute(
      POST,
      createRequestWithBody(
        JSON.stringify({
          albumId: ALBUM_ID,
          amountMinor: '1000',
          currency: 'USD',
          externalProductId: 'pri_album_first',
          fractionalDigits: 2,
          provider: 'paddle',
        }),
      ),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({error: 'paddle_price_mismatch'})
    expect(repositoryMocks.connectAlbumOffer).not.toHaveBeenCalled()
  })

  it('should connect a server-priced Paddle Price for an administrator', async () => {
    const response = await invokeApiRoute(
      POST,
      createRequestWithBody(
        JSON.stringify({
          albumId: ALBUM_ID,
          amountMinor: '1000',
          currency: 'USD',
          externalProductId: 'pri_album_first',
          fractionalDigits: 2,
          provider: 'paddle',
        }),
      ),
    )

    expect(response.status).toBe(200)
    expect(paddleMocks.retrievePaddlePrice).toHaveBeenCalledWith('pri_album_first')
    expect(repositoryMocks.connectAlbumOffer).toHaveBeenCalledWith({
      albumId: ALBUM_ID,
      amountMinor: '1000',
      currency: 'USD',
      externalProductId: 'pri_album_first',
      fractionalDigits: 2,
      provider: 'paddle',
    })
  })

  it('should reject a Paddle amount outside the PostgreSQL bigint range', async () => {
    const response = await invokeApiRoute(
      POST,
      createRequestWithBody(
        JSON.stringify({
          albumId: ALBUM_ID,
          amountMinor: '9223372036854775808',
          currency: 'USD',
          externalProductId: 'pri_album_first',
          fractionalDigits: 2,
          provider: 'paddle',
        }),
      ),
    )

    expect(response.status).toBe(400)
    expect(repositoryMocks.connectAlbumOffer).not.toHaveBeenCalled()
  })

  it('should ignore a client-supplied internal product code', async () => {
    const request = new Request('https://www.pomofi.io/api/admin/music/offers', {
      body: JSON.stringify({
        albumId: ALBUM_ID,
        externalProductId: 'pomo.album.first',
        productCode: 'client-controlled-code',
        provider: 'apps-in-toss',
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(200)
    expect(repositoryMocks.connectAlbumOffer).toHaveBeenCalledWith({
      albumId: ALBUM_ID,
      externalProductId: 'pomo.album.first',
      provider: 'apps-in-toss',
    })
  })

  it('should reject a conflicting external product mapping', async () => {
    repositoryMocks.connectAlbumOffer.mockResolvedValue({
      code: 'external_product_conflict',
      success: false,
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(409)
  })

  it('should return the authorization response for a non-administrator', async () => {
    const authorizationResponse = new Response(null, {status: 401})
    authMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: false,
      response: authorizationResponse,
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(401)
    expect(repositoryMocks.connectAlbumOffer).not.toHaveBeenCalled()
  })

  it('should reject invalid and oversized request bodies', async () => {
    const invalidResponse = await invokeApiRoute(
      POST,
      createRequestWithBody(JSON.stringify({provider: 'unknown'})),
    )
    const oversizedResponse = await invokeApiRoute(POST, createRequestWithBody('x'.repeat(8193)))

    expect(invalidResponse.status).toBe(400)
    await expect(invalidResponse.json()).resolves.toEqual({error: 'invalid_request'})
    expect(oversizedResponse.status).toBe(413)
    await expect(oversizedResponse.json()).resolves.toEqual({error: 'invalid_request'})
    expect(repositoryMocks.connectAlbumOffer).not.toHaveBeenCalled()
  })

  it('should report a missing album', async () => {
    repositoryMocks.connectAlbumOffer.mockResolvedValue({
      code: 'album_not_found',
      success: false,
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(404)
  })

  it('should hide repository failures behind a stable server error', async () => {
    const error = new Error('database unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repositoryMocks.connectAlbumOffer.mockRejectedValue(error)

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({error: 'offer_connection_failed'})
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to connect a commerce offer to an album',
      error,
    )
  })
})
