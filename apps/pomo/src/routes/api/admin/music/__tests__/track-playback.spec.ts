import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({findActiveTrackAsset: vi.fn()}))
const playbackMocks = vi.hoisted(() => ({createAdminPlaybackAccess: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/admin-repository', () => repositoryMocks)
vi.mock('src/server/music/admin-playback-access', () => playbackMocks)

import {GET} from '../tracks/[trackId]/playback'
import {invokeApiRoute} from '../../../__tests__/invoke'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const OBJECT_KEY = `tracks/${TRACK_ID}/${ASSET_ID}/source.mp3`
const PLAYBACK_URL = `https://audio.pomofi.io/tracks/${ASSET_ID}/source.mp3?token=signed`
const createRequest = (): Request =>
  new Request(`https://www.pomofi.io/api/admin/music/tracks/${TRACK_ID}/playback`)

describe('admin music track playback route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({authorized: true, cookies: []})
    repositoryMocks.findActiveTrackAsset
      .mockReset()
      .mockResolvedValue({assetId: ASSET_ID, objectKey: OBJECT_KEY})
    playbackMocks.createAdminPlaybackAccess.mockReset().mockResolvedValue({
      expiresAt: new Date('2026-08-23T00:15:00.000Z'),
      url: PLAYBACK_URL,
    })
  })

  it('should return a short-lived playback URL to an administrator', async () => {
    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      expiresAt: '2026-08-23T00:15:00.000Z',
      url: PLAYBACK_URL,
    })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(repositoryMocks.findActiveTrackAsset).toHaveBeenCalledWith(TRACK_ID)
    expect(playbackMocks.createAdminPlaybackAccess).toHaveBeenCalledWith({
      asset: {assetId: ASSET_ID, objectKey: OBJECT_KEY},
    })
  })

  it('should reject playback without an administrator session', async () => {
    authMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: false,
      response: Response.json({error: 'forbidden'}, {status: 403}),
    })

    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(403)
    expect(repositoryMocks.findActiveTrackAsset).not.toHaveBeenCalled()
  })

  it('should reject a track without an active MP3', async () => {
    repositoryMocks.findActiveTrackAsset.mockResolvedValue(null)

    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(404)
    expect(playbackMocks.createAdminPlaybackAccess).not.toHaveBeenCalled()
  })

  it('should reject an invalid track identifier before querying storage', async () => {
    const response = await invokeApiRoute(GET, createRequest(), {trackId: 'invalid'})

    expect(response.status).toBe(400)
    expect(repositoryMocks.findActiveTrackAsset).not.toHaveBeenCalled()
  })

  it('should return a temporary failure when playback access cannot be created', async () => {
    playbackMocks.createAdminPlaybackAccess.mockRejectedValue(
      new Error('configuration unavailable'),
    )
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(503)
  })
})
