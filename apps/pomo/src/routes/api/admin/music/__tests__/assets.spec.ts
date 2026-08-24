import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  activateTrackAsset: vi.fn(),
  failTrackAsset: vi.fn(),
  findPendingTrackAsset: vi.fn(),
  reserveTrackAsset: vi.fn(),
}))
const uploadMocks = vi.hoisted(() => ({
  createTrackPreviewObject: vi.fn(),
  createTrackUpload: vi.fn(),
  inspectTrackUpload: vi.fn(),
}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/admin-repository', () => repositoryMocks)
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

describe('admin music asset route', () => {
  beforeEach(() => {
    authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({authorized: true, cookies: []})
    repositoryMocks.activateTrackAsset.mockReset().mockResolvedValue(true)
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
  })

  it('should reserve a server-owned object key for an administrator', async () => {
    const response = await invokeApiRoute(POST, createRequest('POST', {trackId: TRACK_ID}))

    expect(response.status).toBe(200)
    expect(repositoryMocks.reserveTrackAsset).toHaveBeenCalledWith(TRACK_ID)
    expect(uploadMocks.createTrackUpload).toHaveBeenCalledWith(OBJECT_KEY)
  })

  it('should inspect and activate a completed MP3 upload', async () => {
    const response = await invokeApiRoute(PUT, createRequest('PUT', {assetId: ASSET_ID}))

    expect(response.status).toBe(200)
    expect(repositoryMocks.activateTrackAsset).toHaveBeenCalledWith({
      assetId: ASSET_ID,
      durationMs: 1234,
      etag: 'etag',
      sizeBytes: 1234n,
    })
    expect(uploadMocks.createTrackPreviewObject).toHaveBeenCalledWith(OBJECT_KEY, 1234)
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
})
