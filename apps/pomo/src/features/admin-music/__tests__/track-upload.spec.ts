/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {MAXIMUM_TRACK_BYTES, uploadTrackAudio, validateTrackAudio} from '../track-upload'

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

  it.each([
    new File([], 'empty.mp3', {type: 'audio/mpeg'}),
    new File(['mp3'], 'large.mp3', {type: 'audio/mpeg'}),
  ])('should reject an empty or oversized MP3', (file) => {
    if (file.name === 'large.mp3') {
      Object.defineProperty(file, 'size', {value: MAXIMUM_TRACK_BYTES + 1})
    }

    expect(() => validateTrackAudio(file)).toThrow('MP3 파일은 250MB 이하여야 합니다.')
  })

  it.each([
    new File(['mp3'], 'track.bin', {type: 'audio/mpeg'}),
    new File(['mp3'], 'TRACK.MP3', {type: 'application/octet-stream'}),
  ])('should accept MP3 identity from either MIME type or extension', (file) => {
    expect(() => validateTrackAudio(file)).not.toThrow()
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

    await expect(uploadTrackAudio({file, trackId: TRACK_ID})).resolves.toEqual({status: 'active'})

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

  it.each([
    {
      message: 'MP3 업로드를 준비하지 못했습니다.',
      responses: [new Response(null, {status: 503})],
    },
    {
      message: 'MP3를 R2에 업로드하지 못했습니다.',
      responses: [
        Response.json({
          assetId: ASSET_ID,
          expiresAt: '2026-08-22T15:00:00.000Z',
          uploadUrl: 'https://account.r2.cloudflarestorage.com/bucket/key?signature=value',
        }),
        new Response(null, {status: 503}),
      ],
    },
  ])('should report a failed upload stage: $message', async ({message, responses}) => {
    const fetcher = vi.fn<typeof fetch>()
    for (const response of responses) {
      fetcher.mockResolvedValueOnce(response)
    }
    vi.stubGlobal('fetch', fetcher)

    await expect(
      uploadTrackAudio({
        file: new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'}),
        trackId: TRACK_ID,
      }),
    ).rejects.toThrow(message)
  })

  it('should reject a definitive completion failure without retrying', async () => {
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
      .mockResolvedValueOnce(new Response(null, {status: 400}))
    vi.stubGlobal('fetch', fetcher)

    await expect(
      uploadTrackAudio({
        file: new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'}),
        trackId: TRACK_ID,
      }),
    ).rejects.toThrow('MP3 형식 또는 재생 시간을 검증하지 못했습니다.')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it.each([
    ['a lost response', new TypeError('network unavailable')],
    ['a server error', new Response(null, {status: 503})],
  ])('should confirm the same asset after %s', async (_name, firstCompletion) => {
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

    if (firstCompletion instanceof Response) {
      fetcher.mockResolvedValueOnce(firstCompletion)
    } else {
      fetcher.mockRejectedValueOnce(firstCompletion)
    }

    fetcher.mockResolvedValueOnce(Response.json({assetId: ASSET_ID, status: 'active'}))
    vi.stubGlobal('fetch', fetcher)

    await expect(
      uploadTrackAudio({
        file: new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'}),
        trackId: TRACK_ID,
      }),
    ).resolves.toEqual({status: 'active'})
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      '/api/admin/music/assets',
      expect.objectContaining({body: JSON.stringify({assetId: ASSET_ID}), method: 'PUT'}),
    )
  })

  it('should preserve an unconfirmed upload after bounded completion checks', async () => {
    const finalError = new TypeError('network still unavailable')
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
      .mockResolvedValueOnce(new Response(null, {status: 503}))
      .mockRejectedValueOnce(finalError)
    vi.stubGlobal('fetch', fetcher)

    const result = await uploadTrackAudio({
      file: new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'}),
      trackId: TRACK_ID,
    })

    expect(result).toMatchObject({status: 'unconfirmed'})
    expect(result.status === 'unconfirmed' ? result.error.cause : undefined).toBe(finalError)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})
