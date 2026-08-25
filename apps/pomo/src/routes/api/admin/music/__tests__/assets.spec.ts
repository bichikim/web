import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  completeTrackRegistration: vi.fn(),
  failTrackAsset: vi.fn(),
  findPendingTrackAsset: vi.fn(),
  reserveTrackAsset: vi.fn(),
}))
const uploadMocks = vi.hoisted(() => ({
  createTrackPreviewObject: vi.fn(),
  createTrackUpload: vi.fn(),
  inspectTrackUpload: vi.fn(),
  isTrackValidationError: vi.fn(),
}))
const artworkMocks = vi.hoisted(() => ({storeTrackArtwork: vi.fn()}))
const deletionMocks = vi.hoisted(() => ({deleteTrackAssetStorage: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/track-registration-repository', () => repositoryMocks)
vi.mock('src/server/music/cover-upload', () => artworkMocks)
vi.mock('src/server/music/track-storage-deletion', () => deletionMocks)
vi.mock('src/server/music/track-upload', () => uploadMocks)

import {POST, PUT} from '../assets'
import {invokeApiRoute} from '../../../__tests__/invoke'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const OBJECT_KEY = `tracks/${TRACK_ID}/${ASSET_ID}/source.mp3`
const createRequest = (method: 'POST' | 'PUT', body: Readonly<Record<string, string>>): Request =>
  new Request('https://www.pomofi.io/api/admin/music/assets', {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method,
  })
const createMalformedRequest = (method: 'POST' | 'PUT'): Request =>
  new Request('https://www.pomofi.io/api/admin/music/assets', {
    body: '{',
    headers: {'Content-Type': 'application/json'},
    method,
  })

describe('admin music asset route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({authorized: true, cookies: []})
    repositoryMocks.completeTrackRegistration.mockReset().mockResolvedValue(true)
    repositoryMocks.failTrackAsset.mockReset().mockResolvedValue(undefined)
    repositoryMocks.findPendingTrackAsset
      .mockReset()
      .mockResolvedValue({id: ASSET_ID, objectKey: OBJECT_KEY})
    repositoryMocks.reserveTrackAsset
      .mockReset()
      .mockResolvedValue({assetId: ASSET_ID, objectKey: OBJECT_KEY})
    uploadMocks.createTrackUpload.mockReset().mockResolvedValue({
      expiresAt: '2026-08-22T15:00:00.000Z',
      uploadUrl: 'https://r2.example/upload',
    })
    uploadMocks.inspectTrackUpload.mockReset().mockResolvedValue({
      durationMs: 1234,
      etag: 'etag',
      sizeBytes: 1234n,
    })
    uploadMocks.createTrackPreviewObject.mockReset().mockResolvedValue(undefined)
    artworkMocks.storeTrackArtwork.mockReset().mockResolvedValue({
      artworkUrl: 'https://storage.pomofi.io/track-artwork/asset/cover',
    })
    deletionMocks.deleteTrackAssetStorage.mockReset().mockResolvedValue(undefined)
    uploadMocks.isTrackValidationError
      .mockReset()
      .mockImplementation(
        (error: unknown) => error instanceof TypeError && error.message === 'invalid_mp3',
      )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['POST', POST, {trackId: TRACK_ID}],
    ['PUT', PUT, {assetId: ASSET_ID}],
  ] as const)('should return the authorization rejection for %s', async (method, handler, body) => {
    const authorizationResponse = Response.json({error: 'unauthorized'}, {status: 401})
    authMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: false,
      response: authorizationResponse,
    })

    const response = await invokeApiRoute(handler, createRequest(method, body))

    expect(response).toBe(authorizationResponse)
    expect(repositoryMocks.reserveTrackAsset).not.toHaveBeenCalled()
    expect(repositoryMocks.findPendingTrackAsset).not.toHaveBeenCalled()
  })

  it.each([
    ['POST', POST, {trackId: 'not-a-uuid'}],
    ['PUT', PUT, {assetId: 'not-a-uuid'}],
  ] as const)('should reject an invalid %s request body', async (method, handler, body) => {
    const response = await invokeApiRoute(handler, createRequest(method, body))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'invalid_request'})
  })

  it.each([
    ['POST', POST],
    ['PUT', PUT],
  ] as const)('should preserve a malformed JSON status for %s', async (method, handler) => {
    const response = await invokeApiRoute(handler, createMalformedRequest(method))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'invalid_request'})
  })

  it('should reserve a server-owned object key for an administrator', async () => {
    const response = await invokeApiRoute(POST, createRequest('POST', {trackId: TRACK_ID}))

    expect(response.status).toBe(200)
    expect(repositoryMocks.reserveTrackAsset).toHaveBeenCalledWith(TRACK_ID)
    expect(uploadMocks.createTrackUpload).toHaveBeenCalledWith(OBJECT_KEY)
  })

  it('should return not found when the track cannot reserve an asset', async () => {
    repositoryMocks.reserveTrackAsset.mockResolvedValue(null)

    const response = await invokeApiRoute(POST, createRequest('POST', {trackId: TRACK_ID}))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({error: 'track_not_found'})
    expect(uploadMocks.createTrackUpload).not.toHaveBeenCalled()
  })

  it('should return unavailable when track asset reservation throws', async () => {
    const error = new Error('database unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repositoryMocks.reserveTrackAsset.mockRejectedValue(error)

    const response = await invokeApiRoute(POST, createRequest('POST', {trackId: TRACK_ID}))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({error: 'track_upload_unavailable'})
    expect(consoleError).toHaveBeenCalledWith('Failed to reserve a music track asset', error)
  })

  it('should inspect and activate a completed MP3 upload', async () => {
    const response = await invokeApiRoute(PUT, createRequest('PUT', {assetId: ASSET_ID}))

    expect(response.status).toBe(200)
    expect(repositoryMocks.completeTrackRegistration).toHaveBeenCalledWith({
      artworkUrl: null,
      assetId: ASSET_ID,
      durationMs: 1234,
      etag: 'etag',
      sizeBytes: 1234n,
    })
    expect(uploadMocks.createTrackPreviewObject).toHaveBeenCalledWith(OBJECT_KEY, 1234)
    expect(artworkMocks.storeTrackArtwork).not.toHaveBeenCalled()
    expect(deletionMocks.deleteTrackAssetStorage).not.toHaveBeenCalled()
  })

  it('should return not found when a pending asset no longer exists', async () => {
    repositoryMocks.findPendingTrackAsset.mockResolvedValue(null)

    const response = await invokeApiRoute(PUT, createRequest('PUT', {assetId: ASSET_ID}))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({error: 'asset_not_found'})
    expect(uploadMocks.inspectTrackUpload).not.toHaveBeenCalled()
  })

  it('should persist an embedded cover while completing an MP3 upload', async () => {
    const artwork = {body: new ArrayBuffer(1), contentType: 'image/jpeg'} as const
    uploadMocks.inspectTrackUpload.mockResolvedValue({
      artwork,
      durationMs: 1234,
      etag: 'etag',
      sizeBytes: 1234n,
    })

    const response = await invokeApiRoute(PUT, createRequest('PUT', {assetId: ASSET_ID}))

    expect(response.status).toBe(200)
    expect(artworkMocks.storeTrackArtwork).toHaveBeenCalledExactlyOnceWith(ASSET_ID, artwork)
    expect(repositoryMocks.completeTrackRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        artworkUrl: 'https://storage.pomofi.io/track-artwork/asset/cover',
      }),
    )
  })

  it('should remove derived storage when deletion wins the registration race', async () => {
    repositoryMocks.completeTrackRegistration.mockResolvedValue(false)

    const response = await invokeApiRoute(PUT, createRequest('PUT', {assetId: ASSET_ID}))

    expect(response.status).toBe(409)
    expect(deletionMocks.deleteTrackAssetStorage).toHaveBeenCalledExactlyOnceWith(OBJECT_KEY)
  })

  it('should mark an invalid uploaded file as failed', async () => {
    uploadMocks.inspectTrackUpload.mockRejectedValue(new TypeError('invalid_mp3'))

    const response = await invokeApiRoute(PUT, createRequest('PUT', {assetId: ASSET_ID}))

    expect(response.status).toBe(400)
    expect(repositoryMocks.failTrackAsset).toHaveBeenCalledWith(ASSET_ID, 'invalid_mp3')
  })

  it('should preserve a pending asset when R2 validation is temporarily unavailable', async () => {
    uploadMocks.inspectTrackUpload.mockRejectedValue(new Error('R2 unavailable'))

    const response = await invokeApiRoute(PUT, createRequest('PUT', {assetId: ASSET_ID}))

    expect(response.status).toBe(503)
    expect(repositoryMocks.failTrackAsset).not.toHaveBeenCalled()
  })

  it('should preserve a pending asset when R2 configuration is unavailable', async () => {
    uploadMocks.inspectTrackUpload.mockRejectedValue(
      new TypeError('CLOUDFLARE_R2_ACCOUNT_ID is not set'),
    )

    const response = await invokeApiRoute(PUT, createRequest('PUT', {assetId: ASSET_ID}))

    expect(response.status).toBe(503)
    expect(repositoryMocks.failTrackAsset).not.toHaveBeenCalled()
  })
})
