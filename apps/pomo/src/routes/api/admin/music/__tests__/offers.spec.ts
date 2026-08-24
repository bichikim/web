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
})
