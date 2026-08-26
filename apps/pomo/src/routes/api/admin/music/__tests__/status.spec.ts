import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({updateAlbumStatus: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/admin-repository', () => repositoryMocks)

import {POST} from '../status'
import {invokeApiRoute} from '../../../__tests__/invoke'

const ALBUM_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const createRequest = (): Request =>
  new Request('https://www.pomofi.io/api/admin/music/status', {
    body: JSON.stringify({action: 'publish', albumId: ALBUM_ID}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

const createRequestWithBody = (body: string): Request =>
  new Request('https://www.pomofi.io/api/admin/music/status', {
    body,
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

describe('admin music album status route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({authorized: true, cookies: []})
    repositoryMocks.updateAlbumStatus
      .mockReset()
      .mockResolvedValue({status: 'published', success: true})
  })

  it('should reject a status change before writing when the session is not admin', async () => {
    authMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: false,
      response: Response.json({error: 'forbidden'}, {status: 403}),
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(403)
    expect(repositoryMocks.updateAlbumStatus).not.toHaveBeenCalled()
  })

  it('should publish through the server-authoritative transition', async () => {
    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(200)
    expect(repositoryMocks.updateAlbumStatus).toHaveBeenCalledWith(ALBUM_ID, 'publish')
  })

  it('should return release blockers as a conflict', async () => {
    repositoryMocks.updateAlbumStatus.mockResolvedValue({
      blockers: ['tracks_missing_active_asset'],
      code: 'release_blocked',
      success: false,
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      blockers: ['tracks_missing_active_asset'],
      code: 'release_blocked',
    })
  })

  it('should reject invalid and oversized request bodies', async () => {
    const invalidResponse = await invokeApiRoute(
      POST,
      createRequestWithBody(JSON.stringify({action: 'preview', albumId: ALBUM_ID})),
    )
    const oversizedResponse = await invokeApiRoute(POST, createRequestWithBody('x'.repeat(4097)))

    expect(invalidResponse.status).toBe(400)
    await expect(invalidResponse.json()).resolves.toEqual({error: 'invalid_request'})
    expect(oversizedResponse.status).toBe(413)
    await expect(oversizedResponse.json()).resolves.toEqual({error: 'invalid_request'})
    expect(repositoryMocks.updateAlbumStatus).not.toHaveBeenCalled()
  })

  it('should report an album missing during the transition', async () => {
    repositoryMocks.updateAlbumStatus.mockResolvedValue({
      code: 'album_not_found',
      success: false,
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(404)
  })

  it('should hide repository failures behind a stable server error', async () => {
    const error = new Error('database unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repositoryMocks.updateAlbumStatus.mockRejectedValue(error)

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({error: 'album_status_update_failed'})
    expect(consoleError).toHaveBeenCalledWith('Failed to update a music album status', error)
  })
})
