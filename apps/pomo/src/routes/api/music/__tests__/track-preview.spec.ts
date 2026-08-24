import {beforeEach, describe, expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({findPublishedTrackPreviewAsset: vi.fn()}))
const storageMocks = vi.hoisted(() => ({ensureTrackPreviewObject: vi.fn()}))
const previewMocks = vi.hoisted(() => ({verifyPreviewAccess: vi.fn()}))

vi.mock('src/server/music/catalog-repository', () => repositoryMocks)
vi.mock('src/server/music/track-upload', () => storageMocks)
vi.mock('src/server/music/preview-access', () => previewMocks)

import {GET} from '../tracks/[trackId]/preview'
import {invokeApiRoute} from '../../__tests__/invoke'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET = {
  assetId: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  durationMs: 180_000,
  objectKey:
    'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3',
}
const createRequest = (): Request =>
  new Request(
    `https://www.pomofi.io/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET.assetId}&token=preview-token`,
  )

describe('authenticated track preview route', () => {
  beforeEach(() => {
    const previewBody = new Response('preview').body

    if (previewBody === null) {
      throw new TypeError('Preview response body is unavailable')
    }

    repositoryMocks.findPublishedTrackPreviewAsset.mockReset().mockResolvedValue(ASSET)
    previewMocks.verifyPreviewAccess.mockReset().mockResolvedValue(ASSET)
    storageMocks.ensureTrackPreviewObject.mockReset().mockResolvedValue({
      body: previewBody,
      contentLength: 7,
      etag: 'preview-etag',
    })
  })

  it('should reject a missing preview token before catalog access', async () => {
    const request = new Request(
      `https://www.pomofi.io/api/music/tracks/${TRACK_ID}/preview?asset=${ASSET.assetId}`,
    )

    const response = await invokeApiRoute(GET, request, {trackId: TRACK_ID})

    expect(response.status).toBe(400)
    expect(repositoryMocks.findPublishedTrackPreviewAsset).not.toHaveBeenCalled()
  })

  it('should reject a token that is not valid for the active preview asset', async () => {
    previewMocks.verifyPreviewAccess.mockResolvedValue(null)

    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(401)
    expect(repositoryMocks.findPublishedTrackPreviewAsset).not.toHaveBeenCalled()
    expect(storageMocks.ensureTrackPreviewObject).not.toHaveBeenCalled()
  })

  it('should stream only the server-created preview object for a published track', async () => {
    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg')
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=300')
    expect(await response.text()).toBe('preview')
    expect(storageMocks.ensureTrackPreviewObject).toHaveBeenCalledWith(
      ASSET.objectKey,
      ASSET.durationMs,
    )
  })

  it('should serve a valid byte range from the bounded preview object', async () => {
    const request = new Request(createRequest(), {headers: {Range: 'bytes=0-2'}})

    const response = await invokeApiRoute(GET, request, {trackId: TRACK_ID})

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Length')).toBe('3')
    expect(response.headers.get('Content-Range')).toBe('bytes 0-2/7')
    expect(await response.text()).toBe('pre')
  })

  it('should reject an unsatisfiable byte range without reading the body', async () => {
    const request = new Request(createRequest(), {headers: {Range: 'bytes=7-'}})

    const response = await invokeApiRoute(GET, request, {trackId: TRACK_ID})

    expect(response.status).toBe(416)
    expect(response.headers.get('Content-Range')).toBe('bytes */7')
    expect(response.body).toBeNull()
  })

  it('should not reveal an unpublished or unknown track', async () => {
    repositoryMocks.findPublishedTrackPreviewAsset.mockResolvedValue(null)

    const response = await invokeApiRoute(GET, createRequest(), {trackId: TRACK_ID})

    expect(response.status).toBe(404)
    expect(storageMocks.ensureTrackPreviewObject).not.toHaveBeenCalled()
  })

  it('should reject a stale asset version after the active audio changes', async () => {
    const staleAssetId = '019d1990-1dc9-7255-a7b5-f9459dfaf799'
    previewMocks.verifyPreviewAccess.mockResolvedValue({
      assetId: staleAssetId,
      objectKey: ASSET.objectKey.replace(ASSET.assetId, staleAssetId),
    })
    const request = new Request(
      `https://www.pomofi.io/api/music/tracks/${TRACK_ID}/preview?asset=${staleAssetId}&token=preview-token`,
    )

    const response = await invokeApiRoute(GET, request, {trackId: TRACK_ID})

    expect(response.status).toBe(404)
    expect(storageMocks.ensureTrackPreviewObject).not.toHaveBeenCalled()
  })
})
