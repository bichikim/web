/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {uploadTrackAudio, validateTrackAudio} from '../track-upload'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('validateTrackAudio', () => {
  it('should reject a non-MP3 file', () => {
    expect(() => validateTrackAudio(new File(['wav'], 'track.wav', {type: 'audio/wav'}))).toThrow(
      'MP3 파일만',
    )
  })
})

describe('uploadTrackAudio', () => {
  it('should reserve, directly upload, and complete one private track asset', async () => {
    const file = new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'})
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          assetId: ASSET_ID,
          expiresAt: '2026-08-22T15:00:00.000Z',
          uploadUrl: 'https://account.r2.cloudflarestorage.com/bucket/key?signature=value',
        }),
      )
      .mockResolvedValueOnce(new Response(null, {status: 200}))
      .mockResolvedValueOnce(Response.json({assetId: ASSET_ID, status: 'active'}))
    vi.stubGlobal('fetch', fetcher)

    await uploadTrackAudio({file, trackId: TRACK_ID})

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('r2.cloudflarestorage.com'),
      expect.objectContaining({body: file, method: 'PUT'}),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      '/api/admin/music/assets',
      expect.objectContaining({body: JSON.stringify({assetId: ASSET_ID}), method: 'PUT'}),
    )
  })
})
