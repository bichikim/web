import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({createPendingTrack: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/track-registration-repository', () => repositoryMocks)

import {POST} from '../tracks'
import {invokeApiRoute} from '../../../__tests__/invoke'

const ALBUM_ID = '019d0000-0000-7000-8000-000000000001'
const createRequest = (
  body: BodyInit = JSON.stringify({albumId: ALBUM_ID, artist: ' Artist ', title: ' Track '}),
): Request =>
  new Request('https://pomo.example/api/admin/music/tracks', {
    body,
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

beforeEach(() => {
  vi.restoreAllMocks()
  authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({
    authorized: true,
    cookies: ['admin=refreshed'],
  })
  repositoryMocks.createPendingTrack.mockReset()
})

it('should return the authorization response before reading the request', async () => {
  authMocks.authorizeAdminRequest.mockResolvedValue({
    authorized: false,
    response: Response.json({error: 'forbidden'}, {status: 403}),
  })

  const response = await invokeApiRoute(POST, createRequest())

  expect(response.status).toBe(403)
  expect(repositoryMocks.createPendingTrack).not.toHaveBeenCalled()
})

it.each([
  ['invalid JSON', '{', 400],
  ['invalid track metadata', JSON.stringify({albumId: 'invalid', artist: '', title: ''}), 400],
  ['an oversized request', 'x'.repeat(8193), 413],
])('should reject %s', async (_label, body, status) => {
  const response = await invokeApiRoute(POST, createRequest(body))

  expect(response.status).toBe(status)
  await expect(response.json()).resolves.toEqual({error: 'invalid_request'})
  expect(repositoryMocks.createPendingTrack).not.toHaveBeenCalled()
})

it('should report when the target album does not exist', async () => {
  repositoryMocks.createPendingTrack.mockResolvedValue(null)

  const response = await invokeApiRoute(POST, createRequest())

  expect(response.status).toBe(404)
  await expect(response.json()).resolves.toEqual({error: 'album_not_found'})
})

it('should create a normalized pending track', async () => {
  repositoryMocks.createPendingTrack.mockResolvedValue({id: 'track-1', status: 'pending'})

  const response = await invokeApiRoute(POST, createRequest())

  expect(response.status).toBe(201)
  await expect(response.json()).resolves.toEqual({id: 'track-1', status: 'pending'})
  expect(repositoryMocks.createPendingTrack).toHaveBeenCalledWith({
    albumId: ALBUM_ID,
    artist: 'Artist',
    title: 'Track',
  })
})

it('should return an internal error when track creation fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  repositoryMocks.createPendingTrack.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(POST, createRequest())

  expect(response.status).toBe(500)
  await expect(response.json()).resolves.toEqual({error: 'track_create_failed'})
})
