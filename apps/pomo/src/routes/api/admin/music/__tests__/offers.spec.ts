import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({connectAlbumOffer: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/admin-repository', () => repositoryMocks)

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
  })

  it('should connect an Apps in Toss one-time product for an administrator', async () => {
    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(200)
    expect(repositoryMocks.connectAlbumOffer).toHaveBeenCalledWith({
      albumId: ALBUM_ID,
      externalProductId: 'pomo.album.first',
      provider: 'apps-in-toss',
    })
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
