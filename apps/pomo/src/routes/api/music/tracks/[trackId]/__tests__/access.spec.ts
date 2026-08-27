import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authenticateAppRequest: vi.fn()}))
const neonMocks = vi.hoisted(() => ({getNeonSession: vi.fn()}))
const playbackMocks = vi.hoisted(() => ({createPlaybackAccess: vi.fn()}))
const previewMocks = vi.hoisted(() => ({createPreviewAccess: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  findEntitledTrackPlaybackAsset: vi.fn(),
  findPublishedTrackPreviewAsset: vi.fn(),
}))
const userMocks = vi.hoisted(() => ({findOrCreateNeonUser: vi.fn()}))

vi.mock('src/server/music/catalog-repository', () => repositoryMocks)
vi.mock('src/server/music/playback-access', () => playbackMocks)
vi.mock('src/server/music/preview-access', () => previewMocks)
vi.mock('src/server/user-auth/http', () => authMocks)
vi.mock('src/server/user-auth/neon-session', () => neonMocks)
vi.mock('src/server/user-auth/repository', () => userMocks)

import {GET} from '../access'
import {invokeApiRoute} from '../../../../__tests__/invoke'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET = {
  assetId: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  durationMs: 180_000,
  objectKey:
    'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3',
}
const createRequest = (authorization?: string): Request =>
  new Request(`https://www.pomofi.io/api/music/tracks/${TRACK_ID}/access`, {
    headers: authorization === undefined ? undefined : {Authorization: authorization},
  })

describe('track access route', () => {
  beforeEach(() => {
    authMocks.authenticateAppRequest.mockReset().mockResolvedValue(null)
    neonMocks.getNeonSession.mockReset().mockResolvedValue({cookies: [], identity: null})
    playbackMocks.createPlaybackAccess.mockReset().mockResolvedValue({
      expiresAt: new Date('2026-08-23T01:15:00.000Z'),
      url: 'https://audio.pomofi.io/tracks/asset/source.mp3?token=signed',
    })
    previewMocks.createPreviewAccess.mockReset().mockResolvedValue({
      expiresAt: new Date('2026-08-23T01:05:00.000Z'),
      url: `/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET.assetId}&token=preview-token`,
    })
    repositoryMocks.findPublishedTrackPreviewAsset.mockReset().mockResolvedValue(ASSET)
    repositoryMocks.findEntitledTrackPlaybackAsset.mockReset().mockResolvedValue(null)
    userMocks.findOrCreateNeonUser.mockReset().mockResolvedValue('web-user-id')
  })

  it('should reject an anonymous preview request before catalog access', async () => {
    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({error: 'unauthorized'})
    expect(repositoryMocks.findPublishedTrackPreviewAsset).not.toHaveBeenCalled()
    expect(playbackMocks.createPlaybackAccess).not.toHaveBeenCalled()
  })

  it('should issue a bounded preview URL for an authenticated web user without entitlement', async () => {
    neonMocks.getNeonSession.mockResolvedValue({
      cookies: ['neon-session=refreshed'],
      identity: {id: 'neon-user-id'},
    })

    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      mode: 'preview',
      url: `/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET.assetId}&token=preview-token`,
    })
    expect(userMocks.findOrCreateNeonUser).toHaveBeenCalledWith('neon-user-id')
    expect(previewMocks.createPreviewAccess).toHaveBeenCalledWith({
      asset: ASSET,
      trackId: TRACK_ID,
    })
    expect(response.headers.getSetCookie()).toContain('neon-session=refreshed')
  })

  it('should issue a full signed URL only after app authentication and entitlement lookup', async () => {
    authMocks.authenticateAppRequest.mockResolvedValue({token: 'app-token', userId: 'user-id'})
    repositoryMocks.findEntitledTrackPlaybackAsset.mockResolvedValue(ASSET)

    const response = await invokeApiRoute(GET, createRequest('Bearer app-token'), {
      trackId: TRACK_ID,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      mode: 'full',
      url: 'https://audio.pomofi.io/tracks/asset/source.mp3?token=signed',
    })
    expect(repositoryMocks.findEntitledTrackPlaybackAsset).toHaveBeenCalledWith('user-id', TRACK_ID)
    expect(playbackMocks.createPlaybackAccess).toHaveBeenCalledWith({asset: ASSET})
    expect(repositoryMocks.findPublishedTrackPreviewAsset).not.toHaveBeenCalled()
  })

  it('should reject an invalid app bearer token', async () => {
    const response = await invokeApiRoute(GET, createRequest('Bearer invalid'), {
      trackId: TRACK_ID,
    })

    expect(response.status).toBe(401)
    expect(repositoryMocks.findEntitledTrackPlaybackAsset).not.toHaveBeenCalled()
    expect(repositoryMocks.findPublishedTrackPreviewAsset).not.toHaveBeenCalled()
    expect(playbackMocks.createPlaybackAccess).not.toHaveBeenCalled()
  })

  it('should reject an invalid track identifier before authentication', async () => {
    const response = await invokeApiRoute(GET, createRequest(), {trackId: 'invalid'})

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'invalid_track_id'})
    expect(neonMocks.getNeonSession).not.toHaveBeenCalled()
  })

  it('should report a missing published preview asset', async () => {
    neonMocks.getNeonSession.mockResolvedValue({
      cookies: [],
      identity: {id: 'neon-user-id'},
    })
    repositoryMocks.findPublishedTrackPreviewAsset.mockResolvedValue(null)

    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({error: 'track_not_found'})
    expect(previewMocks.createPreviewAccess).not.toHaveBeenCalled()
  })

  it('should hide access resolution failures behind a stable service error', async () => {
    const error = new Error('identity provider unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    neonMocks.getNeonSession.mockRejectedValue(error)

    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({error: 'track_access_unavailable'})
    expect(consoleError).toHaveBeenCalledWith('Failed to resolve music track access', error)
  })
})
